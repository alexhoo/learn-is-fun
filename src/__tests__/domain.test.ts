import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allLessons, course, exerciseWordIds, validateCourse, words } from '../content';
import { evaluate } from '../domain/evaluate';
import type { FillBlankExercise } from '../domain/types';
import {
  addDays,
  daysBetween,
  emptyProgress,
  isLessonUnlocked,
  reduceProgress,
  replay,
  scoreOf,
  starsFor,
  summarize,
} from '../domain/progress';
import type { ExerciseResult, LessonCompletedEvent } from '../domain/types';

const result = (over: Partial<ExerciseResult> = {}): ExerciseResult => ({
  exerciseId: 'x',
  wordIds: ['w_cat'],
  firstTry: true,
  attempts: 1,
  misses: 0,
  ...over,
});

let counter = 0;
const lessonEvent = (
  day: string,
  results: ExerciseResult[],
  lessonId = 'animals-01',
): LessonCompletedEvent => ({
  id: `e${++counter}`,
  type: 'LessonCompleted',
  profileId: 'p',
  at: `${day}T10:00:00.000Z`,
  day,
  lessonId,
  results,
});

describe('contenido', () => {
  it('el curso es íntegro (referencias, duplicados, destinos)', () => {
    assert.deepEqual(validateCourse(), []);
  });

  it('detecta referencias rotas', () => {
    const broken = structuredClone(course);
    broken.units[0].lessons[0].exercises[0] = {
      id: 'bad',
      type: 'pick-image',
      difficulty: 1,
      skill: 'vocab',
      answer: 'w_nope',
      distractors: ['w_cat'],
    };
    const errors = validateCourse(broken, words);
    assert.ok(errors.some((e) => e.includes('w_nope')));
  });

  it('cada lección tiene ejercicios de varios tipos', () => {
    for (const lesson of allLessons()) {
      assert.ok(new Set(lesson.exercises.map((e) => e.type)).size >= 4, lesson.id);
    }
  });
});

describe('evaluate', () => {
  const [lesson] = allLessons();
  const byType = (t: string) => lesson.exercises.find((e) => e.type === t)!;

  it('pick-image y drag-to-image', () => {
    const pick = byType('pick-image');
    assert.equal(evaluate(pick, 'w_cat'), true);
    assert.equal(evaluate(pick, 'w_dog'), false);
    const drag = byType('drag-to-image');
    assert.equal(evaluate(drag, 'w_dog'), true);
    assert.equal(evaluate(drag, 'w_cat'), false);
  });

  it('order-words ignora mayúsculas y espacios', () => {
    const order = byType('order-words');
    assert.equal(evaluate(order, ['I', 'see', 'a', 'dog']), true);
    assert.equal(evaluate(order, ['i', 'SEE', 'a', 'dog']), true);
    assert.equal(evaluate(order, ['see', 'I', 'a', 'dog']), false);
  });

  it('scramble compara la palabra formada', () => {
    const scramble = byType('scramble');
    assert.equal(evaluate(scramble, ['c', 'a', 't']), true);
    assert.equal(evaluate(scramble, ['t', 'a', 'c']), false);
  });

  it('match exige todas las parejas, en cualquier orden', () => {
    const match = byType('match');
    assert.equal(evaluate(match, ['w_fish', 'w_bird', 'w_dog', 'w_cat']), true);
    assert.equal(evaluate(match, ['w_fish', 'w_bird', 'w_dog']), false);
  });

  it('un tipo de respuesta equivocado no es correcto', () => {
    assert.equal(evaluate(byType('order-words'), 'I see a dog'), false);
    assert.equal(evaluate(byType('match'), 'w_cat'), false);
  });
});

describe('progreso', () => {
  it('estrellas: siempre al menos una', () => {
    assert.equal(starsFor(0), 1);
    assert.equal(starsFor(0.6), 2);
    assert.equal(starsFor(0.95), 3);
    assert.equal(scoreOf([result(), result({ firstTry: false })]), 0.5);
    assert.equal(scoreOf([]), 0);
  });

  it('lección perfecta: 3 estrellas, XP, monedas, pegatina e insignias', () => {
    const before = emptyProgress();
    const event = lessonEvent('2026-11-03', Array.from({ length: 6 }, () => result()));
    const after = reduceProgress(before, event);
    assert.equal(after.lessons['animals-01'].stars, 3);
    assert.equal(after.xp, 6 * 10 + 20);
    assert.equal(after.coins, 16);
    assert.deepEqual(after.stickers, ['animals-01']);
    assert.ok(after.badges.includes('first-lesson'));
    assert.ok(after.badges.includes('perfect-lesson'));
    const summary = summarize(before, after, event);
    assert.equal(summary.stars, 3);
    assert.equal(summary.xpGained, 80);
    assert.deepEqual(summary.newStickers, ['animals-01']);
  });

  it('con fallos se gana menos XP pero nunca se pierde progreso', () => {
    const first = reduceProgress(
      emptyProgress(),
      lessonEvent('2026-11-03', Array.from({ length: 6 }, () => result())),
    );
    const worse = reduceProgress(
      first,
      lessonEvent('2026-11-03', Array.from({ length: 6 }, () => result({ firstTry: false, misses: 1 }))),
    );
    assert.equal(worse.lessons['animals-01'].stars, 3); // se conserva el máximo
    assert.equal(worse.lessons['animals-01'].completions, 2);
    assert.equal(worse.xp, first.xp + 6 * 5 + 0);
  });

  it('sube de nivel cada 100 XP', () => {
    let p = emptyProgress();
    for (let i = 0; i < 2; i++) {
      p = reduceProgress(p, lessonEvent('2026-11-03', Array.from({ length: 6 }, () => result())));
    }
    assert.equal(p.xp, 160);
    assert.equal(p.level, 2);
  });

  it('maestría sube con aciertos a la primera y programa el repaso', () => {
    let p = reduceProgress(emptyProgress(), lessonEvent('2026-11-03', [result()]));
    assert.equal(p.words['w_cat'].mastery, 1);
    assert.equal(p.words['w_cat'].nextReview, '2026-11-04');
    p = reduceProgress(p, lessonEvent('2026-11-04', [result()]));
    assert.equal(p.words['w_cat'].mastery, 2);
    assert.equal(p.words['w_cat'].nextReview, '2026-11-07');
    p = reduceProgress(p, lessonEvent('2026-11-05', [result({ firstTry: false, misses: 1 })]));
    assert.equal(p.words['w_cat'].mastery, 2); // un fallo no resta
    assert.equal(p.words['w_cat'].nextReview, '2026-11-06'); // pero se repasa mañana
  });

  it('la maestría no pasa de 4', () => {
    let p = emptyProgress();
    for (let i = 0; i < 8; i++) p = reduceProgress(p, lessonEvent('2026-11-03', [result()]));
    assert.equal(p.words['w_cat'].mastery, 4);
  });

  describe('racha', () => {
    const play = (p = emptyProgress(), day: string) =>
      reduceProgress(p, lessonEvent(day, [result()]));

    it('cuenta días seguidos y no cambia el mismo día', () => {
      let p = play(undefined, '2026-11-01');
      p = play(p, '2026-11-01');
      assert.equal(p.streak.current, 1);
      p = play(p, '2026-11-02');
      p = play(p, '2026-11-03');
      assert.equal(p.streak.current, 3);
      assert.ok(p.badges.includes('streak-3'));
    });

    it('los días de descanso cubren huecos sin perder la racha', () => {
      let p = play(undefined, '2026-11-01');
      p = play(p, '2026-11-02');
      p = play(p, '2026-11-04'); // se salta el 3 → consume 1 descanso
      assert.equal(p.streak.current, 3);
      assert.equal(p.streak.restDays, 1);
    });

    it('si el hueco supera los descansos, la racha vuelve a 1 sin castigo extra', () => {
      let p = play(undefined, '2026-11-01');
      p = play(p, '2026-11-02');
      p = play(p, '2026-11-10');
      assert.equal(p.streak.current, 1);
      assert.equal(p.streak.restDays, 2);
    });
  });

  it('replay reconstruye exactamente el progreso incremental', () => {
    const events = [
      lessonEvent('2026-11-01', [result(), result({ firstTry: false, misses: 1 })]),
      lessonEvent('2026-11-02', [result(), result()], 'animals-02'),
      lessonEvent('2026-11-03', [result({ wordIds: ['w_dog'] })]),
    ];
    const incremental = events.reduce(reduceProgress, emptyProgress());
    assert.deepEqual(replay([...events].reverse()), incremental);
  });

  it('desbloqueo lineal: la primera siempre, el resto tras una estrella', () => {
    const lessons = allLessons();
    let p = emptyProgress();
    assert.equal(isLessonUnlocked(p, lessons[0].id), true);
    assert.equal(isLessonUnlocked(p, lessons[1].id), false);
    p = reduceProgress(p, lessonEvent('2026-11-03', [result(), result({ firstTry: false })], lessons[0].id));
    assert.equal(isLessonUnlocked(p, lessons[1].id), true);
    assert.equal(isLessonUnlocked(p, lessons[2].id), false);
  });

  it('utilidades de fechas', () => {
    assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-11-03', 14), '2026-11-17');
  });
});

describe('fill-blank', () => {
  const fb: FillBlankExercise = {
    id: 'fb1',
    type: 'fill-blank',
    difficulty: 1,
    skill: 'grammar',
    sentence: { en: 'It ___ a cat', es: 'Es un gato' },
    answer: 'is',
    options: ['is', 'are'],
  };

  it('evaluate ignora mayúsculas y espacios y rechaza otros tipos de respuesta', () => {
    assert.equal(evaluate(fb, 'is'), true);
    assert.equal(evaluate(fb, ' IS '), true);
    assert.equal(evaluate(fb, 'are'), false);
    assert.equal(evaluate(fb, ['is']), false);
  });

  it('no alimenta la maestría de palabras', () => {
    assert.deepEqual(exerciseWordIds(fb), []);
  });

  const errorsFor = (patch: Partial<FillBlankExercise>) => {
    const copy = structuredClone(course);
    copy.units[0].lessons[0].exercises.push({ ...fb, ...patch });
    return validateCourse(copy, words);
  };

  it('el ejemplo válido no da errores', () => {
    assert.deepEqual(errorsFor({}), []);
  });

  it('valida el hueco, las opciones y la respuesta', () => {
    const bad: Partial<FillBlankExercise>[] = [
      { sentence: { en: 'It is a cat', es: 'x' } }, // sin hueco
      { sentence: { en: 'It ___ ___ cat', es: 'x' } }, // dos huecos
      { answer: 'am' }, // fuera de las opciones
      { options: ['is'] }, // menos de 2
      { options: ['is', 'IS'] }, // duplicadas
      { options: ['is', 'are', 'am', 'be', 'was'] }, // más de 4
    ];
    for (const patch of bad) {
      assert.ok(errorsFor(patch).some((e) => e.includes('fb1')), JSON.stringify(patch));
    }
  });
});
