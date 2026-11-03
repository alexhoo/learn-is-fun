import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { feedback } from '../services/feedback';
import { colors, radius } from '../theme';

type Tone = 'primary' | 'success' | 'danger' | 'accent' | 'neutral';

const tones: Record<Tone, { face: string; edge: string; text: string }> = {
  primary: { face: colors.primary, edge: colors.primaryDark, text: '#FFFFFF' },
  success: { face: colors.success, edge: colors.successDark, text: '#FFFFFF' },
  danger: { face: colors.danger, edge: colors.dangerDark, text: '#FFFFFF' },
  accent: { face: colors.accent, edge: colors.accentDark, text: colors.ink },
  neutral: { face: '#FFFFFF', edge: colors.border, text: colors.ink },
};

const EDGE = 6;

type Props = {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Botón grande con "grosor" que se hunde al pulsarlo. Objetivo táctil amplio para niños. */
export function ChunkyButton({ label, onPress, tone = 'primary', disabled, style }: Props) {
  const pressed = useSharedValue(0);
  const t = disabled ? { face: colors.locked, edge: colors.lockedDark, text: '#FFFFFF' } : tones[tone];

  const face = useAnimatedStyle(() => ({ transform: [{ translateY: pressed.value * EDGE }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={() => (pressed.value = withTiming(1, { duration: 70 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: 110 }))}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={[styles.wrap, { backgroundColor: t.edge }, style]}
    >
      <Animated.View style={[styles.face, { backgroundColor: t.face, borderColor: tone === 'neutral' ? colors.border : t.face }, face]}>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    paddingBottom: EDGE,
    minHeight: 64,
  },
  face: {
    borderRadius: radius.md,
    minHeight: 58,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
});
