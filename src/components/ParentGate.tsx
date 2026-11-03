import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { makeGateQuestion, type GateQuestion } from '../domain/profile';
import { colors, radius } from '../theme';
import { ChunkyButton } from './ChunkyButton';

type Props = {
  visible: boolean;
  onPass: () => void;
  onCancel: () => void;
};

/**
 * Puerta parental: una multiplicación que un niño de 7-11 años no resuelve de cabeza.
 * Protege crear, borrar y gestionar perfiles. No es seguridad fuerte: es un freno razonable.
 */
export function ParentGate({ visible, onPass, onCancel }: Props) {
  const [question, setQuestion] = useState<GateQuestion>(() => makeGateQuestion());
  const [value, setValue] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuestion(makeGateQuestion());
      setValue('');
      setFailed(false);
    }
  }, [visible]);

  const submit = () => {
    if (Number(value.trim()) === question.answer) {
      onPass();
    } else {
      setFailed(true);
      setValue('');
      setQuestion(makeGateQuestion());
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>Grown-ups only</Text>
          <Text style={styles.sub}>Solve this to continue</Text>
          <Text style={styles.question} accessibilityLabel={`${question.text}`}>
            {question.text} = ?
          </Text>
          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t.replace(/[^0-9]/g, ''));
              setFailed(false);
            }}
            onSubmitEditing={submit}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            style={styles.input}
            accessibilityLabel="Answer"
          />
          {failed ? <Text style={styles.error}>Not quite. Try this new one!</Text> : null}
          <ChunkyButton label="OK" onPress={submit} disabled={value.length === 0} style={styles.button} />
          <Pressable onPress={onCancel} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,45,66,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink },
  sub: { fontSize: 18, fontWeight: '600', color: colors.inkSoft },
  question: { fontSize: 44, fontWeight: '900', color: colors.primaryDark, marginVertical: 6 },
  input: {
    width: 160,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '800',
    color: colors.ink,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  error: { fontSize: 17, fontWeight: '700', color: colors.dangerDark },
  button: { alignSelf: 'stretch', marginTop: 8 },
  cancel: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { fontSize: 18, fontWeight: '800', color: colors.inkSoft },
});
