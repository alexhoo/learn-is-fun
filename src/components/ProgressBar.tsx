import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '../theme';

type Props = {
  /** 0..1 */
  value: number;
  color?: string;
  height?: number;
};

/** Barra de progreso con animación elástica. */
export function ProgressBar({ value, color = colors.success, height = 18 }: Props) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withSpring(Math.max(0, Math.min(1, value)), { damping: 14, stiffness: 120 });
  }, [value, v]);

  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, fill]}>
        <View style={[styles.shine, { borderRadius: height / 2 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, backgroundColor: colors.track, overflow: 'hidden', minWidth: 60 },
  fill: { height: '100%', minWidth: 14 },
  shine: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
