import type { ComponentType } from 'react';
import type { Exercise, ExerciseType } from '../domain/types';
import type { ExerciseProps } from './common';
import { DragToImage } from './DragToImage';
import { Match } from './Match';
import { OrderWords } from './OrderWords';
import { PickImage } from './PickImage';
import { Scramble } from './Scramble';

type Registry = { [T in ExerciseType]: ComponentType<ExerciseProps<Extract<Exercise, { type: T }>>> };

/**
 * Registro tipo → componente. Para añadir un ejercicio nuevo:
 * 1) definir su tipo en domain/types.ts y su regla en domain/evaluate.ts,
 * 2) crear su componente y registrarlo aquí. El motor y las lecciones no cambian.
 */
export const exerciseComponents: Registry = {
  'pick-image': PickImage,
  'drag-to-image': DragToImage,
  'order-words': OrderWords,
  match: Match,
  scramble: Scramble,
};

export function ExerciseView(props: ExerciseProps<Exercise>) {
  const Component = exerciseComponents[props.exercise.type] as ComponentType<ExerciseProps<Exercise>>;
  return <Component {...props} />;
}
