import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getWord } from '../content';
import type { MatchExercise } from '../domain/types';
import { feedback } from '../services/feedback';
import { colors, radius } from '../theme';
import { cardColors, Prompt, shuffle, type ExerciseProps } from './common';

/** Parejas palabra ↔ dibujo. Los fallos suman en la máquina pero no bloquean. */
export function Match({ exercise, disabled, onSubmit, onMiss }: ExerciseProps<MatchExercise>) {
  const left = useMemo(() => shuffle(exercise.pairs), [exercise]);
  const right = useMemo(() => shuffle(exercise.pairs, left), [exercise, left]);

  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  useEffect(() => {
    if (matched.length === exercise.pairs.length) onSubmit(matched);
    // onSubmit cambia de identidad en cada render del padre; solo reaccionamos al completar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  const pickWord = (id: string) => {
    if (disabled || matched.includes(id)) return;
    feedback.speak(getWord(id).en);
    setSelected(id);
  };

  const pickImage = (id: string) => {
    if (disabled || matched.includes(id) || !selected) return;
    if (selected === id) {
      feedback.correct();
      setMatched((m) => [...m, id]);
      setSelected(null);
    } else {
      feedback.wrong();
      onMiss();
      setWrongId(id);
      timer.current = setTimeout(() => setWrongId(null), 450);
    }
  };

  return (
    <View style={styles.wrap}>
      <Prompt text="Match the words with the pictures" />
      <View style={styles.columns}>
        <View style={styles.col}>
          {left.map((id) => {
            const done = matched.includes(id);
            const c = cardColors(done ? 'done' : selected === id ? 'selected' : 'idle');
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={getWord(id).en}
                onPress={() => pickWord(id)}
                style={[styles.tile, { backgroundColor: c.bg, borderColor: c.border, opacity: done ? 0.55 : 1 }]}
              >
                <Text style={styles.word}>{getWord(id).en}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.col}>
          {right.map((id) => {
            const done = matched.includes(id);
            const c = cardColors(done ? 'done' : wrongId === id ? 'wrong' : 'idle');
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={getWord(id).es}
                onPress={() => pickImage(id)}
                style={[styles.tile, { backgroundColor: c.bg, borderColor: c.border, opacity: done ? 0.55 : 1 }]}
              >
                <Text style={styles.emoji}>{getWord(id).emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24, alignItems: 'center', width: '100%' },
  columns: { flexDirection: 'row', gap: 22, width: '100%', justifyContent: 'center' },
  col: { flex: 1, maxWidth: 320, gap: 14 },
  tile: {
    height: 92,
    borderRadius: radius.md,
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  word: { fontSize: 32, fontWeight: '900', color: colors.ink },
  emoji: { fontSize: 54 },
});
