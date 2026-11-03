import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hud } from '../components/Hud';
import { LessonNode } from '../components/LessonNode';
import { Mascot } from '../components/Mascot';
import { achievements, allLessons, course } from '../content';
import { currentLessonId, isLessonUnlocked } from '../domain/progress';
import { useGameStore } from '../store';
import { colors, MAX_CONTENT_WIDTH, radius, worlds } from '../theme';

export default function LevelMap() {
  const progress = useGameStore((s) => s.progress);
  const profile = useGameStore((s) => s.profiles.find((p) => p.id === s.activeProfileId));
  const leaveProfile = useGameStore((s) => s.leaveProfile);
  const current = currentLessonId(progress);
  const started = Object.keys(progress.lessons).length > 0;
  const lessons = allLessons();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Playing as ${profile?.nickname ?? 'player'}. Switch player`}
              onPress={() => void leaveProfile()}
              style={styles.player}
            >
              <Text style={styles.playerAvatar}>{profile?.avatar ?? '🙂'}</Text>
              <Text style={styles.playerName} numberOfLines={1}>
                {profile?.nickname ?? 'Player'}
              </Text>
              <Text style={styles.switch}>⇄</Text>
            </Pressable>
            <View style={styles.hud}>
              <Hud progress={progress} />
            </View>
          </View>
          <Mascot
            mood="idle"
            size={84}
            message={started ? 'Welcome back! Ready to play?' : "Hi! I'm Fizz. Let's learn English!"}
          />

          {course.units.map((unit) => {
            const world = worlds[unit.world];
            return (
              <View key={unit.id} style={[styles.unit, { backgroundColor: world.bg }]}>
                <View style={[styles.banner, { backgroundColor: world.path, borderColor: world.pathDark }]}>
                  <Text style={styles.bannerEmoji}>{unit.emoji}</Text>
                  <View>
                    <Text style={styles.bannerTitle}>{unit.title.en}</Text>
                    <Text style={styles.bannerSub}>{unit.title.es}</Text>
                  </View>
                </View>

                <View style={styles.path}>
                  {unit.lessons.map((lesson) => {
                    const index = lessons.findIndex((l) => l.id === lesson.id);
                    const offset = Math.round(Math.sin(index * 1.25) * 70);
                    return (
                      <View key={lesson.id} style={{ transform: [{ translateX: offset }] }}>
                        <LessonNode
                          title={lesson.title.en}
                          emoji={unit.emoji}
                          stars={progress.lessons[lesson.id]?.stars ?? 0}
                          locked={!isLessonUnlocked(progress, lesson.id)}
                          current={lesson.id === current}
                          accent={world.path}
                          accentDark={world.pathDark}
                          onPress={() => router.push(`/lesson/${lesson.id}`)}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <View style={styles.collection}>
            <Text style={styles.sectionTitle}>My collection</Text>
            <View style={styles.badges}>
              {achievements.map((a) => {
                const earned = progress.badges.includes(a.id);
                return (
                  <View
                    key={a.id}
                    accessibilityLabel={`${a.title.en}${earned ? '' : ', not earned yet'}`}
                    accessible
                    style={[styles.badge, !earned && styles.badgeLocked]}
                  >
                    <Text style={[styles.badgeEmoji, !earned && { opacity: 0.25 }]}>{a.emoji}</Text>
                    <Text style={styles.badgeText}>{a.title.en}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hud: { flex: 1 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: 200,
  },
  playerAvatar: { fontSize: 28 },
  playerName: { fontSize: 18, fontWeight: '900', color: colors.ink, flexShrink: 1 },
  switch: { fontSize: 18, fontWeight: '900', color: colors.inkSoft },
  scroll: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 60 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 22, paddingTop: 12 },
  unit: { borderRadius: radius.lg, padding: 16, gap: 28, alignItems: 'center' },
  banner: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.md,
    borderBottomWidth: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  bannerEmoji: { fontSize: 40 },
  bannerTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  bannerSub: { fontSize: 16, fontWeight: '700', color: '#FFFFFFD9' },
  path: { gap: 26, paddingVertical: 8, alignItems: 'center' },
  collection: { gap: 12 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: colors.ink },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: {
    width: 150,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
  },
  badgeLocked: { backgroundColor: colors.bg },
  badgeEmoji: { fontSize: 40 },
  badgeText: { fontSize: 15, fontWeight: '800', color: colors.ink, textAlign: 'center' },
});
