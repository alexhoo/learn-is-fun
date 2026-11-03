import { create } from 'zustand';
import type { ProfileRepository } from '../data/ProfileRepository';
import type { ProgressRepository } from '../data/ProgressRepository';
import { uuid } from '../domain/id';
import {
  checkNickname,
  MAX_PROFILES,
  type NicknameCheck,
  type Profile,
} from '../domain/profile';
import { emptyProgress, localDay, summarize } from '../domain/progress';
import type { ExerciseResult, LessonCompletedEvent, Progress, RewardSummary } from '../domain/types';

export type CreateProfileResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: Exclude<NicknameCheck, { ok: true }>['reason'] | 'limit-reached' };

export type GameState = {
  ready: boolean;
  profiles: Profile[];
  /** Perfil de niño que está jugando; null = mostrar el selector. */
  activeProfileId: string | null;
  /** Progreso del perfil activo. */
  progress: Progress;

  /** Carga perfiles y el progreso del perfil activo. Se llama una vez al arrancar. */
  init: () => Promise<void>;
  createProfile: (nickname: string, avatar: string) => Promise<CreateProfileResult>;
  selectProfile: (profileId: string) => Promise<void>;
  /** Vuelve al selector sin borrar nada. */
  leaveProfile: () => Promise<void>;
  /** Elimina el perfil y todo su progreso. */
  deleteProfile: (profileId: string) => Promise<void>;
  /** Registra una lección terminada del perfil activo y devuelve las recompensas. */
  saveLessonResult: (lessonId: string, results: ExerciseResult[]) => Promise<RewardSummary>;
};

/**
 * Zustand guarda los datos en memoria para pintar la interfaz.
 * La persistencia es responsabilidad de los repositorios, que se inyectan.
 */
export function createGameStore(progressRepo: ProgressRepository, profileRepo: ProfileRepository) {
  return create<GameState>((set, get) => ({
    ready: false,
    profiles: [],
    activeProfileId: null,
    progress: emptyProgress(),

    init: async () => {
      const profiles = await profileRepo.list();
      const storedActive = await profileRepo.getActiveId();
      const activeProfileId = profiles.some((p) => p.id === storedActive) ? storedActive : null;
      const progress = activeProfileId ? await progressRepo.getProgress(activeProfileId) : emptyProgress();
      set({ profiles, activeProfileId, progress, ready: true });
    },

    createProfile: async (nickname, avatar) => {
      if (get().profiles.length >= MAX_PROFILES) return { ok: false, reason: 'limit-reached' };
      const check = checkNickname(nickname);
      if (!check.ok) return { ok: false, reason: check.reason };
      const profile: Profile = {
        id: uuid(),
        nickname: check.value,
        avatar,
        createdAt: new Date().toISOString(),
      };
      await profileRepo.save(profile);
      set({ profiles: [...get().profiles, profile] });
      await get().selectProfile(profile.id);
      return { ok: true, profile };
    },

    selectProfile: async (profileId) => {
      const progress = await progressRepo.getProgress(profileId);
      await profileRepo.setActiveId(profileId);
      set({ activeProfileId: profileId, progress });
    },

    leaveProfile: async () => {
      await profileRepo.setActiveId(null);
      set({ activeProfileId: null, progress: emptyProgress() });
    },

    deleteProfile: async (profileId) => {
      await progressRepo.deleteProfileData(profileId);
      await profileRepo.remove(profileId);
      const wasActive = get().activeProfileId === profileId;
      set({
        profiles: get().profiles.filter((p) => p.id !== profileId),
        ...(wasActive ? { activeProfileId: null, progress: emptyProgress() } : {}),
      });
    },

    saveLessonResult: async (lessonId, results) => {
      const profileId = get().activeProfileId;
      if (!profileId) throw new Error('No hay un perfil activo.');
      const now = new Date();
      const event: LessonCompletedEvent = {
        id: uuid(),
        type: 'LessonCompleted',
        profileId,
        at: now.toISOString(),
        day: localDay(now),
        lessonId,
        results,
      };
      const before = get().progress;
      const after = await progressRepo.appendEvent(profileId, event);
      // Si mientras tanto se cambió de perfil, no se pisa el progreso en pantalla.
      if (get().activeProfileId === profileId) set({ progress: after });
      return summarize(before, after, event);
    },
  }));
}
