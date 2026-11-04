import { useMachine, useSelector } from '@xstate/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fromPromise, type ActorRefFrom } from 'xstate';
import { ChunkyButton } from '../../components/ChunkyButton';
import { Confetti } from '../../components/Confetti';
import { FeedbackBar } from '../../components/FeedbackBar';
import { Mascot, type MascotMood } from '../../components/Mascot';
import { ProgressBar } from '../../components/ProgressBar';
import { Stars } from '../../components/Stars';
import { achievements, findLesson } from '../../content';
import type { Lesson, RewardSummary } from '../../domain/types';
import { ExerciseView } from '../../exercises/registry';
import { exerciseMachine } from '../../machines/exerciseMachine';
import { lessonMachine, type SaveResultInput } from '../../machines/lessonMachine';
import { feedback } from '../../services/feedback';
import { useGameStore } from '../../store';
import { colors, font, MAX_CONTENT_WIDTH, radius } from '../../theme';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const found = id ? findLesson(id) : undefined;

  if (!found) {
    return (
      <SafeAreaView style={styles.center}>
        <Mascot mood="oops" message="I can't find that lesson." />
        <ChunkyButton label="Back" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }
  return <LessonSession lesson={found.lesson} />;
}

function LessonSession({ lesson }: { lesson: Lesson }) {
  const saveLessonResult = useGameStore((s) => s.saveLessonResult);

  // La máquina no conoce el almacenamiento: aquí se le inyecta el guardado real.
  const machine = useMemo(
    () =>
      lessonMachine.provide({
        actors: {
          saveResult: fromPromise<RewardSummary, SaveResultInput>(({ input }) =>
            saveLessonResult(input.lessonId, input.results),
          ),
        },
      }),
    [saveLessonResult],
  );

  const [snapshot, send] = useMachine(machine, { input: { lesson } });
  const total = lesson.exercises.length;
  const done = snapshot.context.results.length;
  const exerciseRef = snapshot.children.exercise as ActorRefFrom<typeof exerciseMachine> | undefined;

  const inSummary = snapshot.matches('summary');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close lesson" onPress={() => router.back()} hitSlop={16} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <ProgressBar value={inSummary ? 1 : done / total} />
      </View>

      {snapshot.matches('intro') && (
        <View style={styles.centerBody}>
          <Mascot mood="cheer" size={110} />
          <Text style={styles.bigTitle}>{lesson.title.en}</Text>
          <Text style={styles.subTitle}>{lesson.title.es}</Text>
          <Text style={styles.meta}>{total} exercises · about 3 minutes</Text>
          <ChunkyButton label="Let's go!" onPress={() => send({ type: 'START' })} style={styles.cta} />
        </View>
      )}

      {snapshot.matches('exercise') && exerciseRef && (
        <ExerciseRunner key={snapshot.context.index} actorRef={exerciseRef} />
      )}

      {snapshot.matches('saving') && (
        <View style={styles.centerBody}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {inSummary && (
        <Summary reward={snapshot.context.reward} saveFailed={snapshot.context.saveFailed} total={total} />
      )}
    </SafeAreaView>
  );
}

const PRAISE = ['Great job!', 'Awesome!', 'Super!', 'Fantastic!', 'You did it!'];
const ENCOURAGE = ['Almost!', 'Oops, try again!', 'Nice try!'];

function ExerciseRunner({ actorRef }: { actorRef: ActorRefFrom<typeof exerciseMachine> }) {
  const state = useSelector(actorRef, (s) => s.value as 'answering' | 'correct' | 'wrong' | 'done');
  const exercise = useSelector(actorRef, (s) => s.context.exercise);
  const attempts = useSelector(actorRef, (s) => s.context.attempts);
  const round = useSelector(actorRef, (s) => s.context.round);

  useEffect(() => {
    if (state === 'correct') feedback.correct();
    if (state === 'wrong') feedback.wrong();
  }, [state]);

  const mood: MascotMood = state === 'correct' ? 'happy' : state === 'wrong' ? 'oops' : 'idle';
  const scrollable = exercise.type !== 'drag-to-image'; // el arrastre no debe competir con el scroll
  const showBar = state === 'correct' || state === 'wrong';

  return (
    <View style={styles.flex}>
      <ScrollView
        scrollEnabled={scrollable}
        contentContainerStyle={[styles.exerciseScroll, showBar && { paddingBottom: 170 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.exerciseColumn}>
          <View style={styles.mascotRow}>
            <Mascot mood={mood} size={64} />
          </View>
          <ExerciseView
            key={`${exercise.id}-${round}`}
            exercise={exercise}
            disabled={state !== 'answering'}
            onSubmit={(answer) => actorRef.send({ type: 'SUBMIT', answer })}
            onMiss={() => actorRef.send({ type: 'MISS' })}
          />
        </View>
      </ScrollView>

      {state === 'correct' && (
        <View style={styles.bar}>
          <FeedbackBar
            kind="correct"
            title={PRAISE[(attempts + exercise.id.length) % PRAISE.length]}
            onPress={() => actorRef.send({ type: 'CONTINUE' })}
          />
        </View>
      )}
      {state === 'wrong' && (
        <View style={styles.bar}>
          <FeedbackBar
            kind="wrong"
            title={ENCOURAGE[(attempts + exercise.id.length) % ENCOURAGE.length]}
            subtitle="You can do it!"
            onPress={() => actorRef.send({ type: 'RETRY' })}
          />
        </View>
      )}
    </View>
  );
}

function Summary({ reward, saveFailed, total }: { reward: RewardSummary | null; saveFailed: boolean; total: number }) {
  const celebrate = (reward?.stars ?? 0) >= 2;

  useEffect(() => {
    if (celebrate) feedback.celebrate();
  }, [celebrate]);

  const badges = (reward?.newBadges ?? [])
    .map((id) => achievements.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.summaryScroll}>
        <Mascot mood={celebrate ? 'cheer' : 'happy'} size={120} />
        <Text style={styles.bigTitle}>{reward && reward.score === 1 ? 'Perfect!' : 'Lesson complete!'}</Text>
        <Stars count={reward?.stars ?? 1} size={64} animate />

        {reward && (
          <View style={styles.stats}>
            <Stat label="XP" value={`+${reward.xpGained}`} color={colors.purple} />
            <Stat label="Coins" value={`+${reward.coinsGained}`} color={colors.accentDark} />
            <Stat label="Streak" value={`🔥 ${reward.streak}`} color={colors.danger} />
          </View>
        )}

        {reward?.levelUp && <Text style={styles.callout}>🎉 Level {reward.newLevel}!</Text>}

        {reward && reward.newStickers.length > 0 && (
          <Text style={styles.callout}>You won a new sticker! 🏅</Text>
        )}

        {badges.map((b) => (
          <View key={b.id} style={styles.badgeRow}>
            <Text style={styles.badgeEmoji}>{b.emoji}</Text>
            <Text style={styles.badgeTitle}>{b.title.en}</Text>
          </View>
        ))}

        {reward && reward.wordsImproved.length > 0 && (
          <Text style={styles.meta}>
            {reward.wordsImproved.length} {reward.wordsImproved.length === 1 ? 'word is' : 'words are'} growing 🌱
          </Text>
        )}

        {saveFailed && (
          <Text style={styles.meta}>We couldn't save this one, but you did great out of {total}!</Text>
        )}

        <ChunkyButton label="Continue" tone="success" onPress={() => router.back()} style={styles.cta} />
      </ScrollView>
      {celebrate && <Confetti />}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH + 40,
    alignSelf: 'center',
  },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, fontWeight: '900', color: colors.inkSoft },
  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  bigTitle: { ...font.title, color: colors.ink, textAlign: 'center' },
  subTitle: { ...font.heading, color: colors.inkSoft },
  meta: { ...font.body, color: colors.inkSoft, textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: 24, minWidth: 280 },
  exerciseScroll: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  exerciseColumn: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 18, alignItems: 'center' },
  mascotRow: { alignSelf: 'flex-start' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  summaryScroll: { alignItems: 'center', gap: 16, padding: 24, paddingBottom: 60 },
  stats: { flexDirection: 'row', gap: 14, marginTop: 8 },
  stat: {
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 3,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statLabel: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.ink },
  callout: { fontSize: 24, fontWeight: '900', color: colors.purpleDark, textAlign: 'center' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  badgeEmoji: { fontSize: 34 },
  badgeTitle: { fontSize: 20, fontWeight: '900', color: colors.ink },
});
