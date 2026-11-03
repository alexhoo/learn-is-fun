import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, MAX_CONTENT_WIDTH } from '../theme';
import { ChunkyButton } from './ChunkyButton';

type Props = {
  kind: 'correct' | 'wrong';
  title: string;
  subtitle?: string;
  onPress: () => void;
};

/** Panel inferior tras responder: animo siempre, sin castigo. */
export function FeedbackBar({ kind, title, subtitle, onPress }: Props) {
  const slide = useSharedValue(120);
  useEffect(() => {
    slide.value = withSpring(0, { damping: 15, stiffness: 140 });
  }, [slide]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }] }));

  const good = kind === 'correct';
  return (
    <Animated.View style={[styles.bar, { backgroundColor: good ? colors.successBg : colors.dangerBg }, style]}>
      <View style={styles.inner}>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: good ? colors.successDark : colors.dangerDark }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: good ? colors.successDark : colors.dangerDark }]}>{subtitle}</Text> : null}
        </View>
        <ChunkyButton label={good ? 'Continue' : 'Try again'} tone={good ? 'success' : 'danger'} onPress={onPress} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: 18, paddingBottom: 28, paddingHorizontal: 20 },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  texts: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 18, fontWeight: '700', marginTop: 2 },
});
