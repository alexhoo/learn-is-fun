import { assign, setup } from 'xstate';
import { exerciseWordIds } from '../content';
import { evaluate } from '../domain/evaluate';
import type { Answer, Exercise, ExerciseResult } from '../domain/types';

export type ExerciseInput = { exercise: Exercise };

type Context = {
  exercise: Exercise;
  attempts: number;
  misses: number;
  /** Sube solo al reintentar: la UI lo usa como key para reiniciar el ejercicio sin remontarlo al responder. */
  round: number;
};

export type ExerciseEvent =
  | { type: 'SUBMIT'; answer: Answer }
  /** Fallo parcial dentro de un ejercicio de varios pasos (p. ej. una pareja equivocada). */
  | { type: 'MISS' }
  | { type: 'RETRY' }
  | { type: 'CONTINUE' };

/**
 * Ciclo de vida común a todos los tipos de ejercicio:
 * answering → correct | wrong → (RETRY) answering … → done.
 * Cada componente solo decide *cómo* se interactúa; esta máquina decide *qué pasa*.
 */
export const exerciseMachine = setup({
  types: {
    context: {} as Context,
    events: {} as ExerciseEvent,
    input: {} as ExerciseInput,
    output: {} as ExerciseResult,
  },
  guards: {
    isCorrect: ({ context, event }) => event.type === 'SUBMIT' && evaluate(context.exercise, event.answer),
  },
  actions: {
    countAttempt: assign({ attempts: ({ context }) => context.attempts + 1 }),
    countMiss: assign({ misses: ({ context }) => context.misses + 1 }),
    nextRound: assign({ round: ({ context }) => context.round + 1 }),
  },
}).createMachine({
  id: 'exercise',
  context: ({ input }) => ({ exercise: input.exercise, attempts: 0, misses: 0, round: 0 }),
  initial: 'answering',
  states: {
    answering: {
      on: {
        SUBMIT: [
          { guard: 'isCorrect', target: 'correct', actions: 'countAttempt' },
          { target: 'wrong', actions: ['countAttempt', 'countMiss'] },
        ],
        MISS: { actions: 'countMiss' },
      },
    },
    correct: { on: { CONTINUE: 'done' } },
    wrong: { on: { RETRY: { target: 'answering', actions: 'nextRound' } } },
    done: { type: 'final' },
  },
  output: ({ context }) => ({
    exerciseId: context.exercise.id,
    wordIds: exerciseWordIds(context.exercise),
    firstTry: context.misses === 0,
    attempts: context.attempts,
    misses: context.misses,
  }),
});
