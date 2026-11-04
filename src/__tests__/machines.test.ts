import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createActor, fromPromise, waitFor } from 'xstate';
import { allLessons, getWord } from '../content';
import type { Answer, Exercise, RewardSummary } from '../domain/types';
import { exerciseMachine } from '../machines/exerciseMachine';
import { lessonMachine, type SaveResultInput } from '../machines/lessonMachine';

/** Respuesta correcta para cada tipo (solo para pruebas). */
function correctAnswer(ex: Exercise): Answer {
  switch (ex.type) {
    case 'pick-image':
      return ex.answer;
    case 'drag-to-image':
      return ex.word;
    case 'order-words':
      return ex.sentence.en.split(' ');
    case 'scramble':
      return getWord(ex.word).en.split('');
    case 'match':
      return [...ex.pairs];
  }
}

const pick = allLessons()[0].exercises[0]; // pick-image: w_cat

describe('exerciseMachine', () => {
  const start = () => {
    const actor = createActor(exerciseMachine, { input: { exercise: pick } });
    actor.start();
    return actor;
  };

  it('acierto a la primera: correct → CONTINUE → done con resultado', () => {
    const actor = start();
    assert.equal(actor.getSnapshot().value, 'answering');
    actor.send({ type: 'SUBMIT', answer: 'w_cat' });
    assert.equal(actor.getSnapshot().value, 'correct');
    actor.send({ type: 'CONTINUE' });
    const snap = actor.getSnapshot();
    assert.equal(snap.status, 'done');
    assert.deepEqual(snap.output, {
      exerciseId: pick.id,
      wordIds: ['w_cat'],
      firstTry: true,
      attempts: 1,
      misses: 0,
    });
  });

  it('round solo avanza al reintentar (la UI lo usa como key para no remontar el ejercicio al responder)', () => {
    const actor = start();
    assert.equal(actor.getSnapshot().context.round, 0);
    actor.send({ type: 'SUBMIT', answer: 'w_dog' });
    assert.equal(actor.getSnapshot().context.round, 0);
    actor.send({ type: 'RETRY' });
    assert.equal(actor.getSnapshot().context.round, 1);
    actor.send({ type: 'SUBMIT', answer: 'w_cat' });
    assert.equal(actor.getSnapshot().context.round, 1);
  });

  it('error: wrong → RETRY → vuelve a intentar; ya no cuenta como primera vez', () => {
    const actor = start();
    actor.send({ type: 'SUBMIT', answer: 'w_dog' });
    assert.equal(actor.getSnapshot().value, 'wrong');
    actor.send({ type: 'RETRY' });
    assert.equal(actor.getSnapshot().value, 'answering');
    actor.send({ type: 'SUBMIT', answer: 'w_cat' });
    actor.send({ type: 'CONTINUE' });
    const out = actor.getSnapshot().output!;
    assert.equal(out.firstTry, false);
    assert.equal(out.attempts, 2);
    assert.equal(out.misses, 1);
  });

  it('transiciones inválidas se ignoran (no se puede continuar sin acertar)', () => {
    const actor = start();
    actor.send({ type: 'CONTINUE' });
    assert.equal(actor.getSnapshot().value, 'answering');
    actor.send({ type: 'SUBMIT', answer: 'w_dog' });
    actor.send({ type: 'SUBMIT', answer: 'w_cat' }); // en wrong no se puede enviar
    assert.equal(actor.getSnapshot().value, 'wrong');
  });

  it('MISS suma fallos parciales sin salir del estado', () => {
    const actor = start();
    actor.send({ type: 'MISS' });
    assert.equal(actor.getSnapshot().value, 'answering');
    actor.send({ type: 'SUBMIT', answer: 'w_cat' });
    actor.send({ type: 'CONTINUE' });
    assert.equal(actor.getSnapshot().output!.firstTry, false);
  });
});

describe('lessonMachine', () => {
  const lesson = allLessons()[0];

  const playLesson = async (mistakeOn: number[] = []) => {
    const saved: unknown[] = [];
    const machine = lessonMachine.provide({
      actors: {
        saveResult: fromPromise<RewardSummary, SaveResultInput>(async ({ input }) => {
          saved.push(input);
          return {
            xpGained: 1, coinsGained: 0, stars: 3, score: 1, levelUp: false, newLevel: 1,
            streak: 1, newBadges: [], newStickers: [], wordsImproved: [],
          };
        }),
      },
    });
    const actor = createActor(machine, { input: { lesson } });
    actor.start();
    assert.equal(actor.getSnapshot().value, 'intro');
    actor.send({ type: 'START' });

    for (let i = 0; i < lesson.exercises.length; i++) {
      const snap = actor.getSnapshot();
      assert.equal(snap.value, 'exercise');
      assert.equal(snap.context.index, i);
      const child = snap.children.exercise!;
      const ex = lesson.exercises[i];
      if (mistakeOn.includes(i)) {
        child.send({ type: 'MISS' });
      }
      child.send({ type: 'SUBMIT', answer: correctAnswer(ex) });
      child.send({ type: 'CONTINUE' });
    }
    await waitFor(actor, (s) => s.status === 'done');
    return { actor, saved };
  };

  it('recorre todos los ejercicios, guarda una vez y termina en el resumen', async () => {
    const { actor, saved } = await playLesson();
    const snap = actor.getSnapshot();
    assert.equal(snap.value, 'summary');
    assert.equal(snap.context.results.length, lesson.exercises.length);
    assert.ok(snap.context.results.every((r) => r.firstTry));
    assert.equal(saved.length, 1);
    assert.equal(snap.context.reward?.stars, 3);
    assert.equal(snap.context.saveFailed, false);
  });

  it('registra qué ejercicios se fallaron', async () => {
    const { actor } = await playLesson([1, 3]);
    const results = actor.getSnapshot().context.results;
    assert.deepEqual(
      results.map((r) => r.firstTry),
      lesson.exercises.map((_, i) => ![1, 3].includes(i)),
    );
  });

  it('si falla el guardado, igualmente llega al resumen', async () => {
    const machine = lessonMachine.provide({
      actors: {
        saveResult: fromPromise<RewardSummary, SaveResultInput>(async () => {
          throw new Error('disco lleno');
        }),
      },
    });
    const actor = createActor(machine, { input: { lesson } });
    actor.start();
    actor.send({ type: 'START' });
    for (const ex of lesson.exercises) {
      const child = actor.getSnapshot().children.exercise!;
      child.send({ type: 'SUBMIT', answer: correctAnswer(ex) });
      child.send({ type: 'CONTINUE' });
    }
    await waitFor(actor, (s) => s.status === 'done');
    assert.equal(actor.getSnapshot().value, 'summary');
    assert.equal(actor.getSnapshot().context.saveFailed, true);
  });

  it('con la implementación por defecto calcula recompensas sin persistir', async () => {
    const actor = createActor(lessonMachine, { input: { lesson } });
    actor.start();
    actor.send({ type: 'START' });
    for (const ex of lesson.exercises) {
      const child = actor.getSnapshot().children.exercise!;
      child.send({ type: 'SUBMIT', answer: correctAnswer(ex) });
      child.send({ type: 'CONTINUE' });
    }
    await waitFor(actor, (s) => s.status === 'done');
    const reward = actor.getSnapshot().context.reward!;
    assert.equal(reward.stars, 3);
    assert.equal(reward.xpGained, lesson.exercises.length * 10 + 20);
  });
});
