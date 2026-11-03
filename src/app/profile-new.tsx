import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChunkyButton } from '../components/ChunkyButton';
import { AVATARS, MAX_NICKNAME_LENGTH } from '../domain/profile';
import { useGameStore, type CreateProfileResult } from '../store';
import { colors, MAX_CONTENT_WIDTH, radius } from '../theme';

const ERRORS: Record<Exclude<CreateProfileResult, { ok: true }>['reason'], string> = {
  empty: 'Write a nickname first.',
  'too-long': `Use ${MAX_NICKNAME_LENGTH} letters or fewer.`,
  'looks-personal': 'Please use a made-up nickname, not a real name or contact details.',
  'limit-reached': 'This device already has the maximum number of players.',
};

/** Crear jugador: solo apodo y avatar. Al crearlo se selecciona y la app pasa al mapa. */
export default function NewProfile() {
  const createProfile = useGameStore((s) => s.createProfile);
  const hasProfiles = useGameStore((s) => s.profiles.length > 0);

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const result = await createProfile(nickname, avatar);
    setBusy(false);
    if (!result.ok) setError(ERRORS[result.reason]);
    // Si va bien, el perfil queda activo y las rutas protegidas llevan al mapa.
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>
            <Text style={styles.title}>New player</Text>

            <View style={styles.preview}>
              <Text style={styles.previewAvatar}>{avatar}</Text>
            </View>

            <Text style={styles.label}>Pick a nickname</Text>
            <TextInput
              value={nickname}
              onChangeText={(t) => {
                setNickname(t);
                setError(null);
              }}
              maxLength={MAX_NICKNAME_LENGTH + 4}
              placeholder="Super Fox"
              placeholderTextColor={colors.locked}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              style={styles.input}
              accessibilityLabel="Nickname"
            />
            <Text style={styles.help}>Not your real name, just a fun one!</Text>

            <Text style={styles.label}>Pick a friend</Text>
            <View style={styles.avatars}>
              {AVATARS.map((a) => (
                <Pressable
                  key={a}
                  accessibilityRole="button"
                  accessibilityLabel={`Avatar ${a}`}
                  accessibilityState={{ selected: a === avatar }}
                  onPress={() => setAvatar(a)}
                  style={[styles.avatarBtn, a === avatar && styles.avatarSelected]}
                >
                  <Text style={styles.avatarText}>{a}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <ChunkyButton label="Create" tone="success" onPress={() => void submit()} disabled={busy} style={styles.cta} />
            {hasProfiles ? (
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { alignItems: 'center', padding: 20, paddingBottom: 60 },
  column: { width: '100%', maxWidth: 560, gap: 14, alignItems: 'center', paddingTop: 12 },
  title: { fontSize: 34, fontWeight: '900', color: colors.ink },
  preview: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#FFE9C7',
    borderWidth: 4,
    borderColor: '#FFD08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatar: { fontSize: 72 },
  label: { alignSelf: 'flex-start', fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 8 },
  input: {
    alignSelf: 'stretch',
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  help: { alignSelf: 'flex-start', fontSize: 16, fontWeight: '600', color: colors.inkSoft },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  avatarBtn: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { borderColor: colors.primary, backgroundColor: '#E7F1FF' },
  avatarText: { fontSize: 40 },
  error: { fontSize: 18, fontWeight: '800', color: colors.dangerDark, textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: 10 },
  cancel: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { fontSize: 18, fontWeight: '800', color: colors.inkSoft },
});
