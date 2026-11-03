// Modelo de dominio. Todo el contenido (palabras, lecciones, ejercicios) son datos:
// los ejercicios referencian palabras por id y nunca incrustan texto de vocabulario.

export type Level = 1 | 2 | 3 | 4 | 5;

export type Skill = 'vocab' | 'listening' | 'spelling' | 'grammar';

export type Word = {
  id: string;
  en: string;
  es: string;
  /** Imagen provisional. Se puede sustituir por `image` (ilustración) sin tocar los ejercicios. */
  emoji: string;
  image?: string;
  category: string;
  level: Level;
};

// ---------------------------------------------------------------------------
// Ejercicios
// ---------------------------------------------------------------------------

type ExerciseBase = {
  id: string;
  difficulty: Level;
  skill: Skill;
};

/** Suena una palabra y se toca la imagen correcta. */
export type PickImageExercise = ExerciseBase & {
  type: 'pick-image';
  answer: string; // wordId
  distractors: string[]; // wordIds
};

/** Se arrastra la palabra escrita hasta el dibujo correcto. */
export type DragToImageExercise = ExerciseBase & {
  type: 'drag-to-image';
  word: string; // wordId que se arrastra
  targets: string[]; // wordIds de los dibujos; debe incluir `word`
};

/** Se ordenan fichas para formar una frase. */
export type OrderWordsExercise = ExerciseBase & {
  type: 'order-words';
  sentence: { en: string; es: string };
  extraTokens?: string[]; // fichas de más para subir la dificultad
};

/** Parejas palabra ↔ imagen. */
export type MatchExercise = ExerciseBase & {
  type: 'match';
  pairs: string[]; // wordIds
};

/** Se forma la palabra tocando letras desordenadas. */
export type ScrambleExercise = ExerciseBase & {
  type: 'scramble';
  word: string; // wordId
  extraLetters?: string[];
};

export type Exercise =
  | PickImageExercise
  | DragToImageExercise
  | OrderWordsExercise
  | MatchExercise
  | ScrambleExercise;

export type ExerciseType = Exercise['type'];

/** Respuesta que cada componente de ejercicio envía a la máquina. */
export type Answer = string | string[];

// ---------------------------------------------------------------------------
// Curso
// ---------------------------------------------------------------------------

export type Lesson = {
  id: string;
  title: { en: string; es: string };
  exercises: Exercise[];
};

export type Unit = {
  id: string;
  title: { en: string; es: string };
  /** Mundo temático: define el color y el decorado del mapa. */
  world: 'farm' | 'rainbow' | 'space' | 'city';
  emoji: string;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  units: Unit[];
};

// ---------------------------------------------------------------------------
// Resultados y eventos de dominio
// ---------------------------------------------------------------------------

export type ExerciseResult = {
  exerciseId: string;
  wordIds: string[];
  /** Acertó a la primera, sin fallos. */
  firstTry: boolean;
  attempts: number;
  misses: number;
};

type EventBase = {
  /** UUID: permite deduplicar al sincronizar con la nube. */
  id: string;
  profileId: string;
  /** Instante ISO. */
  at: string;
  /** Día local YYYY-MM-DD en el momento del evento (hace el reducer determinista). */
  day: string;
};

export type LessonCompletedEvent = EventBase & {
  type: 'LessonCompleted';
  lessonId: string;
  results: ExerciseResult[];
};

export type DomainEvent = LessonCompletedEvent;

// ---------------------------------------------------------------------------
// Progreso del niño
// ---------------------------------------------------------------------------

export type Mastery = 0 | 1 | 2 | 3 | 4; // semilla, brote, flor, árbol, dominada

export type Progress = {
  xp: number;
  level: number;
  coins: number;
  streak: { current: number; lastDay: string | null; restDays: number };
  lessons: Record<string, { stars: 0 | 1 | 2 | 3; bestScore: number; completions: number }>;
  words: Record<string, { mastery: Mastery; nextReview: string }>;
  stickers: string[];
  badges: string[];
  updatedAt: string;
};

export type RewardSummary = {
  xpGained: number;
  coinsGained: number;
  stars: 0 | 1 | 2 | 3;
  score: number; // 0..1, aciertos a la primera
  levelUp: boolean;
  newLevel: number;
  streak: number;
  newBadges: string[];
  newStickers: string[];
  wordsImproved: string[];
};
