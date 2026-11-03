import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LocalProgressRepository } from '../data/LocalProgressRepository';
import { LocalProfileRepository } from '../data/ProfileRepository';
import { MemoryKeyValueStore } from '../data/memoryStore';
import { AVATARS, checkNickname, makeGateQuestion, MAX_PROFILES } from '../domain/profile';
import type { ExerciseResult } from '../domain/types';
import { createGameStore } from '../store/gameStore';

const win: ExerciseResult = { exerciseId: 'x', wordIds: ['w_cat'], firstTry: true, attempts: 1, misses: 0 };

const setup = () => {
  const kv = new MemoryKeyValueStore();
  const progress = new LocalProgressRepository(kv);
  const profiles = new LocalProfileRepository(kv);
  return { kv, progress, profiles, useStore: createGameStore(progress, profiles) };
};

describe('apodo', () => {
  it('normaliza espacios y acepta apodos normales', () => {
    assert.deepEqual(checkNickname('  Super   Fox '), { ok: true, value: 'Super Fox' });
  });

  it('rechaza vacío y demasiado largo', () => {
    assert.deepEqual(checkNickname('   '), { ok: false, reason: 'empty' });
    assert.deepEqual(checkNickname('x'.repeat(15)), { ok: false, reason: 'too-long' });
  });

  it('rechaza lo que parece un dato personal', () => {
    for (const bad of ['ana@mail.com', 'www.x.es', 'https://a.b', '600123456', 'Ana 2015 05']) {
      const r = checkNickname(bad);
      assert.equal(r.ok, false, bad);
    }
    assert.equal(checkNickname('Leo 7').ok, true);
  });
});

describe('puerta parental', () => {
  it('genera multiplicaciones correctas y difíciles para un niño', () => {
    for (let i = 0; i < 200; i++) {
      const q = makeGateQuestion();
      const [a, b] = q.text.split(' × ').map(Number);
      assert.equal(a * b, q.answer);
      assert.ok(a >= 13 && a <= 19 && b >= 6 && b <= 9);
    }
  });

  it('es determinista con un generador fijo', () => {
    assert.deepEqual(makeGateQuestion(() => 0), { text: '13 × 6', answer: 78 });
    assert.deepEqual(makeGateQuestion(() => 0.999), { text: '19 × 9', answer: 171 });
  });
});

describe('LocalProfileRepository', () => {
  it('guarda, actualiza y elimina; limpia el activo al borrarlo', async () => {
    const repo = new LocalProfileRepository(new MemoryKeyValueStore());
    const p = { id: 'a', nickname: 'Leo', avatar: AVATARS[0], createdAt: '2026-11-03T10:00:00.000Z' };
    await repo.save(p);
    await repo.save({ ...p, nickname: 'Leo B' });
    assert.deepEqual((await repo.list()).map((x) => x.nickname), ['Leo B']);
    await repo.setActiveId('a');
    assert.equal(await repo.getActiveId(), 'a');
    await repo.remove('a');
    assert.deepEqual(await repo.list(), []);
    assert.equal(await repo.getActiveId(), null);
  });

  it('datos corruptos devuelven lista vacía', async () => {
    const kv = new MemoryKeyValueStore();
    await kv.setItem('profiles', '{no json');
    assert.deepEqual(await new LocalProfileRepository(kv).list(), []);
  });
});

describe('gameStore con perfiles', () => {
  it('crear un perfil lo deja activo y persistido', async () => {
    const { useStore, profiles } = setup();
    await useStore.getState().init();
    assert.equal(useStore.getState().activeProfileId, null);

    const r = await useStore.getState().createProfile('Leo', '🦁');
    assert.equal(r.ok, true);
    const state = useStore.getState();
    assert.equal(state.profiles.length, 1);
    assert.equal(state.activeProfileId, state.profiles[0].id);
    assert.equal(await profiles.getActiveId(), state.profiles[0].id);
  });

  it('valida el apodo y el límite de perfiles', async () => {
    const { useStore } = setup();
    await useStore.getState().init();
    assert.deepEqual(await useStore.getState().createProfile('ana@x.com', '🦁'), { ok: false, reason: 'looks-personal' });
    for (let i = 0; i < MAX_PROFILES; i++) {
      assert.equal((await useStore.getState().createProfile(`Kid ${i}`, '🦁')).ok, true);
    }
    assert.deepEqual(await useStore.getState().createProfile('Extra', '🦁'), { ok: false, reason: 'limit-reached' });
    assert.equal(useStore.getState().profiles.length, MAX_PROFILES);
  });

  it('el progreso está aislado por perfil y se conserva al cambiar', async () => {
    const { useStore } = setup();
    await useStore.getState().init();
    const leo = (await useStore.getState().createProfile('Leo', '🦁')) as { ok: true; profile: { id: string } };
    await useStore.getState().saveLessonResult('animals-01', [win]);
    assert.equal(useStore.getState().progress.xp, 30);

    await useStore.getState().createProfile('Mia', '🐼');
    assert.equal(useStore.getState().progress.xp, 0); // perfil nuevo, progreso vacío

    await useStore.getState().selectProfile(leo.profile.id);
    assert.equal(useStore.getState().progress.xp, 30);
  });

  it('leaveProfile vuelve al selector sin borrar nada', async () => {
    const { useStore } = setup();
    await useStore.getState().init();
    await useStore.getState().createProfile('Leo', '🦁');
    await useStore.getState().saveLessonResult('animals-01', [win]);
    await useStore.getState().leaveProfile();
    assert.equal(useStore.getState().activeProfileId, null);
    assert.equal(useStore.getState().profiles.length, 1);
    assert.equal(useStore.getState().progress.xp, 0);
  });

  it('sin perfil activo no se puede guardar progreso', async () => {
    const { useStore } = setup();
    await useStore.getState().init();
    await assert.rejects(() => useStore.getState().saveLessonResult('animals-01', [win]), /perfil activo/);
  });

  it('borrar un perfil elimina también su progreso', async () => {
    const { useStore, progress } = setup();
    await useStore.getState().init();
    const leo = (await useStore.getState().createProfile('Leo', '🦁')) as { ok: true; profile: { id: string } };
    await useStore.getState().saveLessonResult('animals-01', [win]);
    await useStore.getState().deleteProfile(leo.profile.id);

    const state = useStore.getState();
    assert.equal(state.profiles.length, 0);
    assert.equal(state.activeProfileId, null);
    assert.equal((await progress.getProgress(leo.profile.id)).xp, 0);
    assert.deepEqual(await progress.getPendingEvents(leo.profile.id), []);
  });

  it('al reiniciar la app se restauran perfiles y perfil activo', async () => {
    const { kv, useStore } = setup();
    await useStore.getState().init();
    await useStore.getState().createProfile('Leo', '🦁');
    await useStore.getState().saveLessonResult('animals-01', [win]);

    const reopened = createGameStore(new LocalProgressRepository(kv), new LocalProfileRepository(kv));
    await reopened.getState().init();
    assert.equal(reopened.getState().profiles.length, 1);
    assert.equal(reopened.getState().activeProfileId, useStore.getState().activeProfileId);
    assert.equal(reopened.getState().progress.xp, 30);
  });

  it('los eventos llevan el id del perfil que jugó', async () => {
    const { useStore, progress } = setup();
    await useStore.getState().init();
    await useStore.getState().createProfile('Leo', '🦁');
    await useStore.getState().saveLessonResult('animals-01', [win]);
    const id = useStore.getState().activeProfileId!;
    const pending = await progress.getPendingEvents(id);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].profileId, id);
  });
});
