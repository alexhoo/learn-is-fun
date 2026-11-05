import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { evaluate } from '../domain/evaluate';
import type { FillBlankExercise } from '../domain/types';
import { feedback } from '../services/feedback';
import { colors, radius } from '../theme';
import { cardColors, Prompt, shuffle, type ExerciseProps } from './common';

/** Se toca la palabra que completa el hueco de la frase. */
export function FillBlank({ exercise, disabled, onSubmit }: ExerciseProps<FillBlankExercise>) {
  const options = useMemo(() => shuffle(exercise.options), [exercise]);
  const [picked, setPicked] = useState<string | null>(null);
  const [before, after] = exercise.sentence.en.split('___');

  const press = (option: string) => {
    setPicked(option);
    // La frase completa solo suena al acertar, para no regalar la respuesta.
    if (evaluate(exercise, option)) feedback.speak(exercise.sentence.en.replace('___', exercise.answer));
    onSubmit(option);
  };

  return (
    <View style={styles.wrap}>
      <Prompt text="Fill the blank" hint={exercise.sentence.es} />

      <View style={styles.sentence} accessibilityLabel={exercise.sentence.en.replace('___', 'blank')}>
        <Text style={styles.sentenceText}>{before}</Text>
        <View style={[styles.slot, picked !== null && styles.slotFilled]}>
          <Text style={styles.sentenceText}>{picked ?? ' '}</Text>
        </View>
        <Text style={styles.sentenceText}>{after}</Text>
      </View>

      <View style={styles.options}>
        {options.map((option) => {
          const state = picked !== option ? 'idle' : evaluate(exercise, option) ? 'correct' : 'wrong';
          const c = cardColors(state);
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option}
              disabled={disabled}
              onPress={() => press(option)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: c.bg, borderColor: c.border, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 32, alignItems: 'center', width: '100%' },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sentenceText: { fontSize: 34, fontWeight: '800', color: colors.ink },
  slot: {
    minWidth: 96,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 4,
    borderColor: colors.primary,
  },
  slotFilled: { borderColor: colors.border },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, width: '100%' },
  option: {
    minWidth: 140,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 26,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderBottomWidth: 7,
  },
  optionText: { fontSize: 30, fontWeight: '800', color: colors.ink },
});
