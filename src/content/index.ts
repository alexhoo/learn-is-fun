import type { Course, Exercise, Lesson, Unit, Word } from '../domain/types';
import achievementsJson from './achievements.json';
import courseJson from './course.json';
import wordsJson from './words.json';

export type AchievementRule =
  | { kind: 'lessonsCompleted'; gte: number }
  | { kind: 'perfectLesson' }
  | { kind: 'streak'; gte: number }
  | { kind: 'wordsMastered'; gte: number };

export type Achievement = {
  id: string;
  title: { en: string; es: string };
  emoji: string;
  rule: AchievementRule;
};

export const course = courseJson as unknown as Course;
export const achievements = achievementsJson as unknown as Achievement[];

export const words: Record<string, Word> = Object.fromEntries(
  (wordsJson as Word[]).map((w) => [w.id, w]),
);

export function getWord(id: string): Word {
  const word = words[id];
  if (!word) throw new Error(`Palabra desconocida: ${id}`);
  return word;
}

export function allLessons(c: Course = course): Lesson[] {
  return c.units.flatMap((u) => u.lessons);
}

export function findLesson(id: string, c: Course = course): { lesson: Lesson; unit: Unit } | undefined {
  for (const unit of c.units) {
    const lesson = unit.lessons.find((l) => l.id === id);
    if (lesson) return { lesson, unit };
  }
  return undefined;
}

/** Ids de palabra que trabaja un ejercicio (alimenta la maestría y el repaso espaciado). */
export function exerciseWordIds(exercise: Exercise): string[] {
  switch (exercise.type) {
    case 'pick-image':
      return [exercise.answer];
    case 'drag-to-image':
    case 'scramble':
      return [exercise.word];
    case 'match':
      return [...exercise.pairs];
    case 'order-words':
      return [];
  }
}

/** Comprueba la integridad del contenido. Devuelve la lista de errores (vacía si todo está bien). */
export function validateCourse(
  c: Course = course,
  vocabulary: Record<string, Word> = words,
  achievementList: Achievement[] = achievements,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const check = (where: string, wordId: string) => {
    if (!vocabulary[wordId]) errors.push(`${where}: palabra inexistente "${wordId}"`);
  };

  for (const unit of c.units) {
    for (const lesson of unit.lessons) {
      if (seen.has(lesson.id)) errors.push(`Lección duplicada: ${lesson.id}`);
      seen.add(lesson.id);
      for (const ex of lesson.exercises) {
        if (seen.has(ex.id)) errors.push(`Ejercicio duplicado: ${ex.id}`);
        seen.add(ex.id);
        switch (ex.type) {
          case 'pick-image':
            check(ex.id, ex.answer);
            ex.distractors.forEach((d) => check(ex.id, d));
            if (ex.distractors.includes(ex.answer)) errors.push(`${ex.id}: la respuesta está entre los distractores`);
            if (ex.distractors.length < 1) errors.push(`${ex.id}: faltan distractores`);
            break;
          case 'drag-to-image':
            check(ex.id, ex.word);
            ex.targets.forEach((t) => check(ex.id, t));
            if (!ex.targets.includes(ex.word)) errors.push(`${ex.id}: los destinos no incluyen la palabra`);
            break;
          case 'match':
            ex.pairs.forEach((p) => check(ex.id, p));
            if (ex.pairs.length < 2) errors.push(`${ex.id}: se necesitan al menos 2 parejas`);
            break;
          case 'scramble':
            check(ex.id, ex.word);
            break;
          case 'order-words':
            if (ex.sentence.en.trim().split(/\s+/).length < 2) errors.push(`${ex.id}: la frase es demasiado corta`);
            break;
        }
      }
    }
  }

  const ids = new Set<string>();
  for (const a of achievementList) {
    if (ids.has(a.id)) errors.push(`Logro duplicado: ${a.id}`);
    ids.add(a.id);
  }
  return errors;
}
