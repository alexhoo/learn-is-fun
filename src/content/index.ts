import { STAGES, stageRank, type Stage } from '../domain/stages';
import type { Course, Exercise, GrammarWord, Lesson, Unit, Word } from '../domain/types';
import achievementsJson from './achievements.json';
import courseJson from './course.json';
import grammarWordsJson from './grammarWords.json';
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
export const grammarWords = grammarWordsJson as unknown as GrammarWord[];

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
    case 'fill-blank':
      return [];
  }
}

const MIN_STAGE_EXERCISES = 5;
const MAX_STAGE_EXERCISES = 8;

/** Palabras sueltas de una frase, en minúsculas y sin puntuación. */
function sentenceTokens(en: string): string[] {
  return en
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Reglas de las lecciones con `stage`: tamaño y vocabulario de las frases.
 * Una palabra de contenido está "introducida" si una lección anterior (o la misma) la enseña;
 * una palabra de gramática, si su etapa no es posterior a la de la lección.
 */
export function validateStageLessons(c: Course, vocabulary: Record<string, Word>, grammar: GrammarWord[]): string[] {
  const errors: string[] = [];
  const taught = new Set<string>(); // ids enseñados hasta ahora, en el orden del curso
  const enOf = (id: string) => vocabulary[id]?.en.toLowerCase();

  for (const lesson of allLessons(c)) {
    lesson.exercises.forEach((ex) => exerciseWordIds(ex).forEach((id) => taught.add(id)));
    const stage = lesson.stage;
    if (stage === undefined) continue;
    if (!STAGES.includes(stage)) {
      errors.push(`${lesson.id}: etapa desconocida "${stage}"`);
      continue;
    }
    const size = lesson.exercises.length;
    if (size < MIN_STAGE_EXERCISES || size > MAX_STAGE_EXERCISES) {
      errors.push(`${lesson.id}: una lección de gramática tiene entre ${MIN_STAGE_EXERCISES} y ${MAX_STAGE_EXERCISES} ejercicios (hay ${size})`);
    }
    const known = new Set<string>();
    for (const id of taught) {
      const en = enOf(id);
      if (en) [en, `${en}s`, `${en}es`].forEach((form) => known.add(form));
    }
    for (const g of grammar) if (stageRank(g.stage) <= stageRank(stage as Stage)) known.add(g.text.toLowerCase());

    for (const ex of lesson.exercises) {
      const sentence =
        ex.type === 'order-words' ? ex.sentence.en : ex.type === 'fill-blank' ? ex.sentence.en.replace('___', ex.answer) : null;
      if (sentence === null) continue;
      for (const token of sentenceTokens(sentence)) {
        if (!known.has(token)) errors.push(`${ex.id}: "${token}" aún no se ha introducido en la etapa ${stage}`);
      }
    }
  }
  return errors;
}

/** Comprueba la integridad del contenido. Devuelve la lista de errores (vacía si todo está bien). */
export function validateCourse(
  c: Course = course,
  vocabulary: Record<string, Word> = words,
  achievementList: Achievement[] = achievements,
  grammar: GrammarWord[] = grammarWords,
): string[] {
  const errors: string[] = validateStageLessons(c, vocabulary, grammar);
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
          case 'fill-blank': {
            const blanks = ex.sentence.en.split('___').length - 1;
            if (blanks !== 1) errors.push(`${ex.id}: la frase debe tener exactamente un hueco (___)`);
            const options = ex.options.map((o) => o.trim().toLowerCase());
            if (!options.includes(ex.answer.trim().toLowerCase())) errors.push(`${ex.id}: la respuesta no está entre las opciones`);
            if (options.length < 2 || options.length > 4) errors.push(`${ex.id}: se necesitan entre 2 y 4 opciones`);
            if (new Set(options).size !== options.length) errors.push(`${ex.id}: opciones duplicadas`);
            break;
          }
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
