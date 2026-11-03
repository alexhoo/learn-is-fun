import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '../components/Mascot';
import { ParentGate } from '../components/ParentGate';
import { MAX_PROFILES, type Profile } from '../domain/profile';
import { authService } from '../services/auth';
import { useGameStore } from '../store';
import { colors, MAX_CONTENT_WIDTH, radius } from '../theme';

/** Selector de perfiles: ¿quién juega? Gestionar perfiles requiere la puerta parental. */
export default function Profiles() {
  const profiles = useGameStore((s) => s.profiles);
  const selectProfile = useGameStore((s) => s.selectProfile);
  const deleteProfile = useGameStore((s) => s.deleteProfile);

  const [gateOpen, setGateOpen] = useState(false);
  const [manage, setManage] = useState(false);

  const canAdd = profiles.length < MAX_PROFILES;
  const first = profiles.length === 0;

  const confirmDelete = (p: Profile) => {
    Alert.alert(
      `Delete ${p.nickname}?`,
      'All of their stars, words and stickers will be removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteProfile(p.id) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <Mascot mood="cheer" size={96} message={first ? "Hi! Let's create your player." : "Who's playing?"} />

          <View style={styles.grid}>
            {profiles.map((p) => (
              <View key={p.id} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Play as ${p.nickname}`}
                  onPress={() => void selectProfile(p.id)}
                  style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                >
                  <Text style={styles.avatar}>{p.avatar}</Text>
                  <Text style={styles.nickname} numberOfLines={1}>
                    {p.nickname}
                  </Text>
                </Pressable>
                {manage ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${p.nickname}`}
                    onPress={() => confirmDelete(p)}
                    style={styles.delete}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            {(first || manage) && canAdd ? (
              <View style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add player"
                  onPress={() => router.push('/profile-new')}
                  style={[styles.card, styles.addCard]}
                >
                  <Text style={styles.plus}>＋</Text>
                  <Text style={styles.nickname}>New player</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {!first ? (
            <View style={styles.parents}>
              {manage ? (
                <>
                  <Pressable accessibilityRole="button" onPress={() => setManage(false)} style={styles.pill}>
                    <Text style={styles.pillText}>Done</Text>
                  </Pressable>
                  <Text style={styles.note}>
                    {authService.cloudAvailable
                      ? 'Create a parent account to keep progress on all your devices.'
                      : 'Progress is saved on this device only. Cloud sync is coming soon.'}
                  </Text>
                </>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Parents area" onPress={() => setGateOpen(true)} style={styles.pill}>
                  <Text style={styles.pillText}>🔒 Parents</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ParentGate
        visible={gateOpen}
        onCancel={() => setGateOpen(false)}
        onPass={() => {
          setGateOpen(false);
          setManage(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { alignItems: 'center', padding: 20, paddingBottom: 60 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 30, paddingTop: 24, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center', width: '100%' },
  cell: { width: 190 },
  card: {
    height: 190,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderBottomWidth: 8,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  addCard: { borderStyle: 'dashed', backgroundColor: 'transparent', borderBottomWidth: 3 },
  avatar: { fontSize: 78 },
  plus: { fontSize: 64, fontWeight: '900', color: colors.primary },
  nickname: { fontSize: 24, fontWeight: '900', color: colors.ink, maxWidth: '100%' },
  delete: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  parents: { alignItems: 'center', gap: 14 },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 26,
  },
  pillText: { fontSize: 18, fontWeight: '800', color: colors.inkSoft },
  note: { fontSize: 16, fontWeight: '600', color: colors.inkSoft, textAlign: 'center', maxWidth: 420 },
});
