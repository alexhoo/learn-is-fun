import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type HostInstance } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getWord } from '../content';
import { evaluate } from '../domain/evaluate';
import type { DragToImageExercise } from '../domain/types';
import { feedback } from '../services/feedback';
import { colors, radius } from '../theme';
import { cardColors, Prompt, shuffle, SpeakerButton, type ExerciseProps } from './common';

type Rect = { x: number; y: number; w: number; h: number };

const measureInWindow = (view: HostInstance) =>
  new Promise<Rect>((resolve) => view.measureInWindow((x, y, w, h) => resolve({ x, y, w, h })));

/** Se arrastra la palabra escrita hasta el dibujo que le corresponde. */
export function DragToImage({ exercise, disabled, onSubmit }: ExerciseProps<DragToImageExercise>) {
  const word = getWord(exercise.word);
  const targets = useMemo(() => shuffle(exercise.targets), [exercise]);
  const refs = useRef<Record<string, HostInstance | null>>({});
  const [dropped, setDropped] = useState<string | null>(null);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);

  const settle = useCallback(
    async (absoluteX: number, absoluteY: number) => {
      for (const id of targets) {
        const view = refs.current[id];
        if (!view) continue;
        const r = await measureInWindow(view);
        if (absoluteX >= r.x && absoluteX <= r.x + r.w && absoluteY >= r.y && absoluteY <= r.y + r.h) {
          setDropped(id);
          if (!evaluate(exercise, id)) {
            tx.value = withSpring(0);
            ty.value = withSpring(0);
          }
          onSubmit(id);
          return;
        }
      }
      // Soltó fuera de cualquier dibujo: la palabra vuelve a su sitio.
      tx.value = withSpring(0);
      ty.value = withSpring(0);
    },
    [targets, exercise, onSubmit, tx, ty],
  );

  const pan = usePanGesture({
    enabled: !disabled,
    onActivate: () => {
      'worklet';
      lift.value = withSpring(1);
      scheduleOnRN(feedback.tap);
    },
    onUpdate: (e) => {
      'worklet';
      tx.value = e.translationX;
      ty.value = e.translationY;
    },
    onDeactivate: (e) => {
      'worklet';
      lift.value = withSpring(0);
      scheduleOnRN(settle, e.absoluteX, e.absoluteY);
    },
  });

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: 1 + lift.value * 0.12 }],
    zIndex: 20,
    shadowOpacity: 0.12 + lift.value * 0.2,
  }));

  return (
    <View style={styles.wrap}>
      <Prompt text="Drag the word to its picture" />
      <View style={styles.chipRow}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.chip, chipStyle]} accessibilityLabel={`Drag the word ${word.en}`}>
            <Text style={styles.chipText}>{word.en}</Text>
          </Animated.View>
        </GestureDetector>
        <SpeakerButton text={word.en} size={60} />
      </View>

      <View style={styles.targets}>
        {targets.map((id) => {
          const w = getWord(id);
          const state = dropped !== id ? 'idle' : evaluate(exercise, id) ? 'correct' : 'wrong';
          const c = cardColors(state);
          return (
            <View
              key={id}
              ref={(v) => {
                refs.current[id] = v;
              }}
              collapsable={false}
              style={[styles.target, { backgroundColor: c.bg, borderColor: c.border }]}
              accessibilityLabel={w.es}
            >
              <Text style={styles.emoji}>{w.emoji}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 26, alignItems: 'center', zIndex: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 18, zIndex: 20 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 3,
    borderBottomWidth: 7,
    borderColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  chipText: { fontSize: 40, fontWeight: '900', color: colors.primaryDark },
  targets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, width: '100%', zIndex: 1 },
  target: {
    width: '42%',
    maxWidth: 260,
    aspectRatio: 1.2,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 84 },
});
