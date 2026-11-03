import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { Stars } from './Stars';

type Props = {
  title: string;
  emoji: string;
  stars: 0 | 1 | 2 | 3;
  locked: boolean;
  current: boolean;
  accent: string;
  accentDark: string;
  onPress: () => void;
};

const SIZE = 96;

/** Nodo del camino de niveles. El actual late para invitar a pulsarlo. */
export function LessonNode({ title, emoji, stars, locked, current, accent, accentDark, onPress }: Props) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!current) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
  }, [current, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const face = locked ? colors.locked : accent;
  const edge = locked ? colors.lockedDark : accentDark;

  return (
    <View style={styles.wrap}>
      {current ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>START</Text>
        </View>
      ) : null}
      <Animated.View style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={locked ? `${title}, locked` : `${title}, ${stars} of 3 stars`}
          accessibilityState={{ disabled: locked }}
          disabled={locked}
          onPress={onPress}
          style={({ pressed }) => [
            styles.node,
            { backgroundColor: face, borderColor: edge, borderBottomWidth: pressed ? 4 : 10, marginTop: pressed ? 6 : 0 },
          ]}
        >
          <Text style={styles.emoji}>{locked ? '🔒' : emoji}</Text>
        </Pressable>
      </Animated.View>
      <Text style={[styles.title, locked && { color: colors.inkSoft }]}>{title}</Text>
      {!locked ? <Stars count={stars} size={22} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  node: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 44 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  bubble: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 2,
  },
  bubbleText: { fontSize: 16, fontWeight: '900', color: colors.primaryDark, letterSpacing: 1 },
});
