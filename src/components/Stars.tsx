import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

type Props = {
  count: 0 | 1 | 2 | 3;
  size?: number;
  /** Anima la aparición de las estrellas una a una. */
  animate?: boolean;
};

function Star({ filled, size, index, animate }: { filled: boolean; size: number; index: number; animate: boolean }) {
  const scale = useSharedValue(animate && filled ? 0 : 1);
  useEffect(() => {
    if (animate && filled) scale.value = withDelay(350 + index * 380, withSpring(1, { damping: 7, stiffness: 140 }));
  }, [animate, filled, index, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: size, opacity: filled ? 1 : 0.22 }}>⭐</Text>
    </Animated.View>
  );
}

/** Muestra de 0 a 3 estrellas. */
export function Stars({ count, size = 22, animate = false }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`${count} of 3 stars`} accessible>
      {[0, 1, 2].map((i) => (
        <Star key={i} filled={i < count} size={size} index={i} animate={animate} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
});
