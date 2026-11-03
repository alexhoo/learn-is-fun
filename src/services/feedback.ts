import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

/**
 * Efectos sensoriales de la app (voz y vibración) detrás de una interfaz.
 * Los sonidos grabados y el reconocimiento de voz se añadirán aquí sin tocar los ejercicios.
 */
export interface FeedbackService {
  speak(text: string): void;
  stopSpeaking(): void;
  tap(): void;
  correct(): void;
  wrong(): void;
  celebrate(): void;
}

const safe = (fn: () => unknown) => {
  try {
    void Promise.resolve(fn()).catch(() => {});
  } catch {
    // La vibración o la voz pueden no estar disponibles (simulador, web): no es un error.
  }
};

export const feedback: FeedbackService = {
  speak: (text) =>
    safe(() => {
      Speech.stop();
      Speech.speak(text, { language: 'en-US', rate: 0.8, pitch: 1.1 });
    }),
  stopSpeaking: () => safe(() => Speech.stop()),
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  correct: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  wrong: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  celebrate: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
