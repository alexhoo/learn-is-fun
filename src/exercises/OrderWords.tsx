import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import type { OrderWordsExercise } from '../domain/types';
import { feedback } from '../services/feedback';
import { ChunkyButton } from '../components/ChunkyButton';
import { colors, radius } from '../theme';
import { Prompt, shuffle, type ExerciseProps } from './common';

type Token = { key: string; text: string };

/** Se ordenan fichas tocándolas para construir la frase. */
export function OrderWords({ exercise, disabled, onSubmit }: ExerciseProps<OrderWordsExercise>) {
  const bank = useMemo<Token[]>(() => {
    const words = exercise.sentence.en.split(/\s+/);
    const all = [...words, ...(exercise.extraTokens ?? [])].map((text, i) => ({ key: `${i}-${text}`, text }));
    return shuffle(all);
  }, [exercise]);

  const [chosen, setChosen] = useState<string[]>([]);
  const byKey = useMemo(() => Object.fromEntries(bank.map((t) => [t.key, t])), [bank]);

  const toggle = (key: string) => {
    if (disabled) return;
    feedback.tap();
    setChosen((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  };

  return (
    <View style={styles.wrap}>
      <Prompt text="Build the sentence" hint={exercise.sentence.es} speak={exercise.sentence.en} />

      <View style={styles.answer} accessibilityLabel="Your sentence">
        {chosen.length === 0 ? <Text style={styles.placeholder}>Tap the words…</Text> : null}
        {chosen.map((key) => (
          <Animated.View key={key} layout={LinearTransition.springify()} entering={FadeIn}>
            <TokenChip text={byKey[key].text} onPress={() => toggle(key)} tone="placed" />
          </Animated.View>
        ))}
      </View>

      <View style={styles.bank}>
        {bank.map((t) => (
          <Animated.View key={t.key} layout={LinearTransition.springify()}>
            <TokenChip text={t.text} onPress={() => toggle(t.key)} tone={chosen.includes(t.key) ? 'used' : 'free'} />
          </Animated.View>
        ))}
      </View>

      <ChunkyButton
        label="Check"
        disabled={disabled || chosen.length === 0}
        onPress={() => onSubmit(chosen.map((k) => byKey[k].text))}
        style={styles.check}
      />
    </View>
  );
}

function TokenChip({ text, onPress, tone }: { text: string; onPress: () => void; tone: 'free' | 'used' | 'placed' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        tone === 'used' && styles.chipUsed,
        tone === 'placed' && styles.chipPlaced,
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <Text style={[styles.chipText, tone === 'used' && { color: 'transparent' }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 26, alignItems: 'center', width: '100%' },
  answer: {
    minHeight: 96,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderBottomWidth: 3,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF80',
  },
  placeholder: { fontSize: 20, fontWeight: '600', color: colors.inkSoft },
  bank: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, width: '100%' },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  chipUsed: { backgroundColor: colors.track, borderColor: colors.track },
  chipPlaced: { borderColor: colors.primary },
  chipText: { fontSize: 26, fontWeight: '800', color: colors.ink },
  check: { alignSelf: 'stretch', marginTop: 4 },
});
