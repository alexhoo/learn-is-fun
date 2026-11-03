import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { getWord } from '../content';
import { evaluate } from '../domain/evaluate';
import type { PickImageExercise } from '../domain/types';
import { feedback } from '../services/feedback';
import { colors, radius } from '../theme';
import { cardColors, Prompt, shuffle, type ExerciseProps } from './common';

/** Suena una palabra y se toca el dibujo correcto. */
export function PickImage({ exercise, disabled, onSubmit }: ExerciseProps<PickImageExercise>) {
  const options = useMemo(() => shuffle([exercise.answer, ...exercise.distractors]), [exercise]);
  const [picked, setPicked] = useState<string | null>(null);
  const answer = getWord(exercise.answer);

  useEffect(() => {
    const id = setTimeout(() => feedback.speak(answer.en), 350);
    return () => clearTimeout(id);
  }, [answer.en]);

  return (
    <View style={styles.wrap}>
      <Prompt text="Listen and tap the picture" speak={answer.en} />
      <View style={styles.grid}>
        {options.map((id, i) => {
          const word = getWord(id);
          const state = picked !== id ? 'idle' : evaluate(exercise, id) ? 'correct' : 'wrong';
          const c = cardColors(state);
          return (
            <Animated.View key={id} entering={ZoomIn.delay(i * 70).springify()} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={word.es}
                disabled={disabled}
                onPress={() => {
                  setPicked(id);
                  onSubmit(id);
                }}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: c.bg, borderColor: c.border, transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
              >
                <Text style={styles.emoji}>{word.emoji}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 28, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, width: '100%' },
  cell: { width: '46%', maxWidth: 300, aspectRatio: 1.15 },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderBottomWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  emoji: { fontSize: 96 },
});
