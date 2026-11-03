import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { ChunkyButton } from '../components/ChunkyButton';
import { getWord } from '../content';
import type { ScrambleExercise } from '../domain/types';
import { feedback } from '../services/feedback';
import { colors, radius } from '../theme';
import { Prompt, shuffle, SpeakerButton, type ExerciseProps } from './common';

type Letter = { key: string; ch: string };

/** Se forma la palabra tocando letras desordenadas, con el dibujo como pista. */
export function Scramble({ exercise, disabled, onSubmit }: ExerciseProps<ScrambleExercise>) {
  const word = getWord(exercise.word);
  const letters = word.en.split('');

  const bank = useMemo<Letter[]>(() => {
    const all = [...letters, ...(exercise.extraLetters ?? [])].map((ch, i) => ({ key: `${i}-${ch}`, ch }));
    if (all.length < 2) return all;
    // Evita que las letras salgan ya en el orden correcto.
    for (let i = 0; i < 8; i++) {
      const candidate = shuffle(all);
      if (candidate.map((l) => l.ch).join('') !== word.en) return candidate;
    }
    return shuffle(all);
  }, [exercise]); // eslint-disable-line react-hooks/exhaustive-deps

  const [placed, setPlaced] = useState<string[]>([]); // keys en orden de colocación
  const byKey = useMemo(() => Object.fromEntries(bank.map((l) => [l.key, l])), [bank]);
  const full = placed.length === letters.length;

  const place = (key: string) => {
    if (disabled || placed.includes(key) || full) return;
    feedback.tap();
    setPlaced((p) => [...p, key]);
  };

  const remove = (key: string) => {
    if (disabled) return;
    feedback.tap();
    setPlaced((p) => p.filter((k) => k !== key));
  };

  return (
    <View style={styles.wrap}>
      <Prompt text="Spell the word" />
      <View style={styles.hintRow}>
        <Text style={styles.emoji}>{word.emoji}</Text>
        <SpeakerButton text={word.en} size={64} />
      </View>

      <View style={styles.slots} accessibilityLabel="Your word">
        {letters.map((_, i) => {
          const key = placed[i];
          return (
            <Pressable key={i} onPress={() => key && remove(key)} style={[styles.slot, key ? styles.slotFilled : null]}>
              {key ? (
                <Animated.Text entering={FadeIn} style={styles.slotText}>
                  {byKey[key].ch}
                </Animated.Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bank}>
        {bank.map((l) => {
          const used = placed.includes(l.key);
          return (
            <Animated.View key={l.key} layout={LinearTransition.springify()}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={l.ch}
                disabled={used}
                onPress={() => place(l.key)}
                style={({ pressed }) => [styles.key, used && styles.keyUsed, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
              >
                <Text style={[styles.keyText, used && { color: 'transparent' }]}>{l.ch}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <ChunkyButton
        label="Check"
        disabled={disabled || !full}
        onPress={() => onSubmit(placed.map((k) => byKey[k].ch))}
        style={styles.check}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 22, alignItems: 'center', width: '100%' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  emoji: { fontSize: 96 },
  slots: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  slot: {
    width: 62,
    height: 72,
    borderRadius: radius.sm,
    borderBottomWidth: 5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2, borderBottomWidth: 5 },
  slotText: { fontSize: 38, fontWeight: '900', color: colors.primaryDark },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%' },
  key: {
    width: 70,
    height: 78,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyUsed: { backgroundColor: colors.track, borderColor: colors.track },
  keyText: { fontSize: 38, fontWeight: '900', color: colors.ink },
  check: { alignSelf: 'stretch' },
});
