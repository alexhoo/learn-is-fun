import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '../theme';

export type MascotMood = 'idle' | 'happy' | 'oops' | 'cheer';

const FACE: Record<MascotMood, string> = { idle: '🦊', happy: '🦊', oops: '🦊', cheer: '🦊' };

type Props = {
  mood?: MascotMood;
  size?: number;
  message?: string;
};

/**
 * Mascota provisional (emoji). Cada estado tiene su animación; cuando haya una
 * animación Rive o Lottie, solo se sustituye el interior de este componente.
 */
export function Mascot({ mood = 'idle', size = 96, message }: Props) {
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(y);
    cancelAnimation(rot);
    cancelAnimation(scale);
    y.value = 0;
    rot.value = 0;
    scale.value = 1;

    if (mood === 'idle') {
      y.value = withRepeat(withSequence(withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1);
    } else if (mood === 'happy') {
      y.value = withSequence(withTiming(-26, { duration: 160 }), withSpring(0, { damping: 6 }));
      scale.value = withSequence(withTiming(1.15, { duration: 160 }), withSpring(1));
    } else if (mood === 'oops') {
      rot.value = withSequence(
        withTiming(-10, { duration: 90 }),
        withRepeat(withSequence(withTiming(10, { duration: 120 }), withTiming(-10, { duration: 120 })), 3, true),
        withTiming(0, { duration: 90 }),
      );
    } else {
      y.value = withRepeat(withSequence(withTiming(-22, { duration: 220 }), withTiming(0, { duration: 220 })), -1);
      rot.value = withRepeat(withSequence(withTiming(-8, { duration: 220 }), withTiming(8, { duration: 220 })), -1, true);
    }
    return () => {
      cancelAnimation(y);
      cancelAnimation(rot);
      cancelAnimation(scale);
    };
  }, [mood, y, rot, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));

  return (
    <View style={styles.row} accessibilityLabel="Fizz, the fox mascot" accessible>
      <Animated.View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }, style]}>
        <Text style={{ fontSize: size * 0.62 }}>{FACE[mood]}</Text>
      </Animated.View>
      {message ? (
        <View style={styles.speech}>
          <Text style={styles.speechText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bubble: {
    backgroundColor: '#FFE9C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFD08A',
  },
  speech: {
    flexShrink: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  speechText: { fontSize: 20, fontWeight: '700', color: colors.ink },
});
