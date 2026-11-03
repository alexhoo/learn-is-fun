import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LocalProgressRepository } from '../data/LocalProgressRepository';
import { MemoryKeyValueStore } from '../data/memoryStore';
import { emptyProgress } from '../domain/progress';
import type { LessonCompletedEvent } from '../domain/types';

const event = (id: string, day: string): LessonCompletedEvent => ({
  id,
  type: 'LessonCompleted',
  profileId: 'p',
  at: `${day}T10:00:00.000Z`,
  day,
  lessonId: 'animals-01',
  results: [{ exerciseId: 'x', wordIds: ['w_cat'], firstTry: true, attempts: 1, misses: 0 }],
});

describe('LocalProgressRepository', () => {
  it('perfil nuevo: progreso vacío', async () => {
    const repo = new LocalProgressRepository(new MemoryKeyValueStore());
    assert.deepEqual(await repo.getProgress('p'), emptyProgress());
  });

  it('appendEvent actualiza el progreso y persiste', async () => {
    const store = new MemoryKeyValueStore();
    const repo = new LocalProgressRepository(store);
    const after = await repo.appendEvent('p', event('e1', '2026-11-03'));
    assert.equal(after.lessons['animals-01'].completions, 1);
    // otra instancia sobre el mismo almacén ve lo mismo (simula reiniciar la app)
    const reopened = new LocalProgressRepository(store);
    assert.deepEqual(await reopened.getProgress('p'), after);
  });

  it('es idempotente: el mismo evento no se aplica dos veces', async () => {
    const repo = new LocalProgressRepository(new MemoryKeyValueStore());
    await repo.appendEvent('p', event('e1', '2026-11-03'));
    const again = await repo.appendEvent('p', event('e1', '2026-11-03'));
    assert.equal(again.lessons['animals-01'].completions, 1);
    assert.equal((await repo.getPendingEvents('p')).length, 1);
  });

  it('eventos pendientes de sincronizar', async () => {
    const repo = new LocalProgressRepository(new MemoryKeyValueStore());
    await repo.appendEvent('p', event('e1', '2026-11-03'));
    await repo.appendEvent('p', event('e2', '2026-11-04'));
    assert.deepEqual((await repo.getPendingEvents('p')).map((e) => e.id), ['e1', 'e2']);
    await repo.markSynced('p', ['e1']);
    assert.deepEqual((await repo.getPendingEvents('p')).map((e) => e.id), ['e2']);
  });

  it('reconstruye el progreso desde los eventos si la instantánea se corrompe', async () => {
    const store = new MemoryKeyValueStore();
    const repo = new LocalProgressRepository(store);
    const good = await repo.appendEvent('p', event('e1', '2026-11-03'));
    await store.setItem('progress:p', '{no es json');
    assert.deepEqual(await repo.getProgress('p'), good);
  });

  it('los perfiles están aislados', async () => {
    const repo = new LocalProgressRepository(new MemoryKeyValueStore());
    await repo.appendEvent('a', event('e1', '2026-11-03'));
    assert.deepEqual(await repo.getProgress('b'), emptyProgress());
  });
});
