import { achievements, allLessons, course, findLesson } from '../content';
import type { Achievement } from '../content';
import type {
  DomainEvent,
  ExerciseResult,
  LessonCompletedEvent,
  Mastery,
  Progress,
  RewardSummary,
} from './types';

export const XP_PER_LEVEL = 100;
const MAX_REST_DAYS = 2;
/** Días hasta el siguiente repaso según la maestría de la palabra. */
const REVIEW_INTERVAL_DAYS: Record<Mastery, number> = { 0: 0, 1: 1, 2: 3, 3: 7, 4: 14 };

export function emptyProgress(now: string = new Date(0).toISOString()): Progress {
  return {
    xp: 0,
    level: 1,
    coins: 0,
    streak: { current: 0, lastDay: null, restDays: MAX_REST_DAYS },
    lessons: {},
    words: {},
    stickers: [],
    badges: [],
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Utilidades de fechas (días locales en formato YYYY-MM-DD)
// ---------------------------------------------------------------------------

export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(day: string, n: number): string {
  const date = new Date(dayNumber(day) * 86_400_000 + n * 86_400_000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Cálculos puros
// ---------------------------------------------------------------------------

/** Proporción de ejercicios acertados a la primera (0..1). */
export function scoreOf(results: ExerciseResult[]): number {
  if (results.length === 0) return 0;
  return results.filter((r) => r.firstTry).length / results.length;
}

/** Siempre se gana al menos 1 estrella: se premia terminar, no solo acertar. */
export function starsFor(score: number): 1 | 2 | 3 {
  if (score >= 0.9) return 3;
  if (score >= 0.6) return 2;
  return 1;
}

export function xpFor(results: ExerciseResult[], stars: number): number {
  const base = results.reduce((sum, r) => sum + (r.firstTry ? 10 : 5), 0);
  return base + (stars === 3 ? 20 : 0);
}

export function levelFor(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function updateStreak(streak: Progress['streak'], day: string): Progress['streak'] {
  if (streak.lastDay === null) return { current: 1, lastDay: day, restDays: streak.restDays };
  const gap = daysBetween(streak.lastDay, day);
  if (gap <= 0) return streak; // mismo día (o evento antiguo): no cambia
  if (gap === 1) return advance(streak, day);
  // Hueco de varios días: los días de descanso lo cubren automáticamente.
  const missed = gap - 1;
  if (missed <= streak.restDays) {
    return advance({ ...streak, restDays: streak.restDays - missed }, day);
  }
  return { current: 1, lastDay: day, restDays: MAX_REST_DAYS };
}

function advance(streak: Progress['streak'], day: string): Progress['streak'] {
  const current = streak.current + 1;
  // Cada 7 días seguidos se recupera un día de descanso.
  const restDays = current % 7 === 0 ? Math.min(MAX_REST_DAYS, streak.restDays + 1) : streak.restDays;
  return { current, lastDay: day, restDays };
}

function masteredCount(words: Progress['words']): number {
  return Object.values(words).filter((w) => w.mastery >= 4).length;
}

function meets(
  achievement: Achievement,
  progress: Progress,
  ctx: { perfect: boolean },
): boolean {
  const rule = achievement.rule;
  switch (rule.kind) {
    case 'lessonsCompleted':
      return Object.values(progress.lessons).filter((l) => l.completions > 0).length >= rule.gte;
    case 'perfectLesson':
      return ctx.perfect;
    case 'streak':
      return progress.streak.current >= rule.gte;
    case 'wordsMastered':
      return masteredCount(progress.words) >= rule.gte;
  }
}

// ---------------------------------------------------------------------------
// Reducer: aplica un evento de dominio al progreso. Determinista y sin efectos.
// ---------------------------------------------------------------------------

export function reduceProgress(progress: Progress, event: DomainEvent): Progress {
  switch (event.type) {
    case 'LessonCompleted':
      return applyLessonCompleted(progress, event);
  }
}

function applyLessonCompleted(progress: Progress, event: LessonCompletedEvent): Progress {
  const score = scoreOf(event.results);
  const stars = starsFor(score);
  const xp = progress.xp + xpFor(event.results, stars);
  const coinsGained = Math.floor(xpFor(event.results, stars) / 5);

  const previous = progress.lessons[event.lessonId];
  const lessons: Progress['lessons'] = {
    ...progress.lessons,
    [event.lessonId]: {
      stars: Math.max(previous?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
      bestScore: Math.max(previous?.bestScore ?? 0, score),
      completions: (previous?.completions ?? 0) + 1,
    },
  };

  // Maestría por palabra: sube con cada acierto a la primera; un fallo no resta, solo adelanta el repaso.
  const words: Progress['words'] = { ...progress.words };
  for (const result of event.results) {
    for (const wordId of result.wordIds) {
      const current = words[wordId]?.mastery ?? 0;
      const mastery = (result.firstTry ? Math.min(4, current + 1) : current) as Mastery;
      const interval = result.firstTry ? REVIEW_INTERVAL_DAYS[mastery] : 1;
      words[wordId] = { mastery, nextReview: addDays(event.day, interval) };
    }
  }

  const stickers = stars === 3 && !progress.stickers.includes(event.lessonId)
    ? [...progress.stickers, event.lessonId]
    : progress.stickers;

  const next: Progress = {
    ...progress,
    xp,
    level: levelFor(xp),
    coins: progress.coins + coinsGained,
    streak: updateStreak(progress.streak, event.day),
    lessons,
    words,
    stickers,
    updatedAt: event.at,
  };

  const perfect = score === 1;
  const earned = achievements
    .filter((a) => !next.badges.includes(a.id) && meets(a, next, { perfect }))
    .map((a) => a.id);

  return earned.length ? { ...next, badges: [...next.badges, ...earned] } : next;
}

/** Reconstruye el progreso desde cero a partir del registro de eventos. */
export function replay(events: DomainEvent[]): Progress {
  return [...events]
    .sort((a, b) => a.at.localeCompare(b.at))
    .reduce(reduceProgress, emptyProgress());
}

/** Resumen de recompensas comparando el progreso antes y después de un evento. */
export function summarize(before: Progress, after: Progress, event: LessonCompletedEvent): RewardSummary {
  const score = scoreOf(event.results);
  return {
    xpGained: after.xp - before.xp,
    coinsGained: after.coins - before.coins,
    stars: starsFor(score),
    score,
    levelUp: after.level > before.level,
    newLevel: after.level,
    streak: after.streak.current,
    newBadges: after.badges.filter((b) => !before.badges.includes(b)),
    newStickers: after.stickers.filter((s) => !before.stickers.includes(s)),
    wordsImproved: Object.keys(after.words).filter(
      (id) => (after.words[id]?.mastery ?? 0) > (before.words[id]?.mastery ?? 0),
    ),
  };
}

// ---------------------------------------------------------------------------
// Consultas para la interfaz
// ---------------------------------------------------------------------------

/** Una lección se desbloquea al conseguir al menos una estrella en la anterior. */
export function isLessonUnlocked(progress: Progress, lessonId: string): boolean {
  const lessons = allLessons(course);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index <= 0) return index === 0;
  return (progress.lessons[lessons[index - 1].id]?.stars ?? 0) >= 1;
}

export function currentLessonId(progress: Progress): string | undefined {
  return allLessons(course).find((l) => (progress.lessons[l.id]?.stars ?? 0) === 0)?.id;
}

export function xpInLevel(progress: Progress): { current: number; needed: number } {
  return { current: progress.xp % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}

export function lessonTitle(lessonId: string): string {
  return findLesson(lessonId)?.lesson.title.en ?? lessonId;
}
