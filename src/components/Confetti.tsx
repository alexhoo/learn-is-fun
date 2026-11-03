import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const PALETTE = ['#FF7A59', '#FFC94D', '#4D96FF', '#3BC47F', '#8B7BFF', '#FF8FB1'];

function Piece({ x, delay, color, drift, spin, height }: { x: number; delay: number; color: string; drift: number; spin: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [
      { translateX: drift * t.value },
      { translateY: -40 + (height + 80) * t.value },
      { rotate: `${spin * t.value}deg` },
    ],
  }));
  return <Animated.View style={[styles.piece, { left: x, backgroundColor: color }, style]} />;
}

/** Lluvia de confeti para celebrar. No intercepta toques. */
export function Confetti({ count = 36 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        delay: Math.random() * 500,
        color: PALETTE[i % PALETTE.length],
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() - 0.5) * 900,
      })),
    [count, width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Piece key={p.id} {...p} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, width: 12, height: 18, borderRadius: 3 },
});
