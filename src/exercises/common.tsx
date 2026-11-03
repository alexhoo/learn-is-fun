import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Answer, Exercise } from '../domain/types';
import { feedback } from '../services/feedback';
import { colors, font } from '../theme';

export type ExerciseProps<E extends Exercise> = {
  exercise: E;
  /** true mientras se muestra el feedback: no se admiten más toques. */
  disabled: boolean;
  onSubmit: (answer: Answer) => void;
  /** Fallo parcial en ejercicios de varios pasos. */
  onMiss: () => void;
};

/** Baraja una copia del array (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], avoidSameAs?: readonly T[]): T[] {
  const out = [...items];
  for (let attempt = 0; attempt < 6; attempt++) {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    const same = avoidSameAs && out.length > 1 && out.every((v, i) => v === avoidSameAs[i]);
    if (!same) break;
  }
  return out;
}

type PromptProps = { text: string; speak?: string; hint?: string };

/** Consigna del ejercicio con botón de altavoz. */
export function Prompt({ text, speak, hint }: PromptProps) {
  return (
    <View style={styles.prompt}>
      <Text style={styles.promptText} accessibilityRole="header">
        {text}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {speak ? <SpeakerButton text={speak} /> : null}
    </View>
  );
}

export function SpeakerButton({ text, size = 72 }: { text: string; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Listen: ${text}`}
      onPress={() => feedback.speak(text)}
      style={({ pressed }) => [
        styles.speaker,
        { width: size, height: size, borderRadius: size / 2, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Text style={{ fontSize: size * 0.46 }}>🔊</Text>
    </Pressable>
  );
}

type CardState = 'idle' | 'selected' | 'correct' | 'wrong' | 'done';

export function cardColors(state: CardState) {
  switch (state) {
    case 'selected':
      return { bg: '#E7F1FF', border: colors.primary };
    case 'correct':
    case 'done':
      return { bg: colors.successBg, border: colors.success };
    case 'wrong':
      return { bg: colors.dangerBg, border: colors.danger };
    default:
      return { bg: colors.card, border: colors.border };
  }
}

export const common = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  prompt: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  promptText: { ...font.heading, color: colors.ink, textAlign: 'center' },
  hint: { ...font.body, color: colors.inkSoft, textAlign: 'center' },
  speaker: {
    backgroundColor: '#E7F1FF',
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
