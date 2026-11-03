import { assign, fromPromise, setup } from 'xstate';
import { uuid } from '../domain/id';
import { emptyProgress, localDay, reduceProgress, summarize } from '../domain/progress';
import type { ExerciseResult, Lesson, LessonCompletedEvent, RewardSummary } from '../domain/types';
import { exerciseMachine } from './exerciseMachine';

export type LessonInput = { lesson: Lesson };

export type SaveResultInput = { lessonId: string; results: ExerciseResult[] };

type Context = {
  lesson: Lesson;
  index: number;
  results: ExerciseResult[];
  reward: RewardSummary | null;
  saveFailed: boolean;
};

export type LessonEvent = { type: 'START' } | { type: 'AGAIN' };

/**
 * Implementación por defecto de `saveResult`: calcula las recompensas sin persistir nada.
 * La app la sustituye con `lessonMachine.provide({ actors: { saveResult } })`,
 * de modo que la máquina no conoce el almacenamiento (se inyecta).
 */
const defaultSaveResult = fromPromise<RewardSummary, SaveResultInput>(async ({ input }) => {
  const now = new Date();
  const event: LessonCompletedEvent = {
    id: uuid(),
    type: 'LessonCompleted',
    profileId: 'preview',
    at: now.toISOString(),
    day: localDay(now),
    lessonId: input.lessonId,
    results: input.results,
  };
  const before = emptyProgress();
  return summarize(before, reduceProgress(before, event), event);
});

/** Sesión de lección: intro → ejercicio × N → guardar → resumen. */
export const lessonMachine = setup({
  types: {
    context: {} as Context,
    events: {} as LessonEvent,
    input: {} as LessonInput,
  },
  actors: {
    exercise: exerciseMachine,
    saveResult: defaultSaveResult,
  },
  guards: {
    hasNext: ({ context }) => context.index + 1 < context.lesson.exercises.length,
  },
  actions: {
    nextExercise: assign({ index: ({ context }) => context.index + 1 }),
    recordResult: assign({
      results: ({ context, event }) => [
        ...context.results,
        (event as unknown as { output: ExerciseResult }).output,
      ],
    }),
  },
}).createMachine({
  id: 'lesson',
  context: ({ input }) => ({
    lesson: input.lesson,
    index: 0,
    results: [],
    reward: null,
    saveFailed: false,
  }),
  initial: 'intro',
  states: {
    intro: { on: { START: 'exercise' } },
    exercise: {
      invoke: {
        id: 'exercise',
        src: 'exercise',
        input: ({ context }) => ({ exercise: context.lesson.exercises[context.index] }),
        onDone: { target: 'advancing', actions: 'recordResult' },
      },
    },
    advancing: {
      always: [
        { guard: 'hasNext', target: 'exercise', actions: 'nextExercise' },
        { target: 'saving' },
      ],
    },
    saving: {
      invoke: {
        id: 'saveResult',
        src: 'saveResult',
        input: ({ context }) => ({ lessonId: context.lesson.id, results: context.results }),
        onDone: {
          target: 'summary',
          actions: assign({ reward: ({ event }) => event.output }),
        },
        onError: {
          // Si falla el guardado, el niño ve igualmente su resumen.
          target: 'summary',
          actions: assign({ saveFailed: true }),
        },
      },
    },
    summary: { type: 'final' },
  },
  output: ({ context }) => ({ reward: context.reward, results: context.results }),
});
