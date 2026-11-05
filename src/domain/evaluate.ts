import { getWord } from '../content';
import type { Answer, Exercise } from './types';

/** Normaliza texto para comparar frases sin depender de mayúsculas ni espacios. */
const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Función pura: ¿es correcta la respuesta a este ejercicio? */
export function evaluate(exercise: Exercise, answer: Answer): boolean {
  switch (exercise.type) {
    case 'pick-image':
      return answer === exercise.answer;
    case 'drag-to-image':
      return answer === exercise.word;
    case 'order-words':
      return Array.isArray(answer) && norm(answer.join(' ')) === norm(exercise.sentence.en);
    case 'fill-blank':
      return typeof answer === 'string' && norm(answer) === norm(exercise.answer);
    case 'scramble':
      return Array.isArray(answer) && norm(answer.join('')) === norm(getWord(exercise.word).en);
    case 'match': {
      if (!Array.isArray(answer)) return false;
      const expected = [...exercise.pairs].sort();
      const given = [...answer].sort();
      return expected.length === given.length && expected.every((id, i) => id === given[i]);
    }
  }
}
