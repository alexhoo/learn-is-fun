import { StyleSheet, Text, View } from 'react-native';
import { xpInLevel } from '../domain/progress';
import type { Progress } from '../domain/types';
import { colors, radius } from '../theme';
import { ProgressBar } from './ProgressBar';

/** Cabecera de progreso: nivel y XP, racha y monedas. */
export function Hud({ progress }: { progress: Progress }) {
  const xp = xpInLevel(progress);
  return (
    <View style={styles.row}>
      <View style={[styles.chip, styles.level]} accessibilityLabel={`Level ${progress.level}`} accessible>
        <Text style={styles.levelText}>Lv {progress.level}</Text>
        <ProgressBar value={xp.current / xp.needed} color={colors.purple} height={14} />
      </View>
      <View style={styles.chip} accessibilityLabel={`${progress.streak.current} day streak`} accessible>
        <Text style={styles.value}>🔥 {progress.streak.current}</Text>
      </View>
      <View style={styles.chip} accessibilityLabel={`${progress.coins} coins`} accessible>
        <Text style={styles.value}>🪙 {progress.coins}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  level: { flex: 1 },
  levelText: { fontSize: 18, fontWeight: '900', color: colors.purpleDark },
  value: { fontSize: 20, fontWeight: '900', color: colors.ink },
});
