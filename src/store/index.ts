import { LocalProfileRepository } from '../data/ProfileRepository';
import { LocalProgressRepository } from '../data/LocalProgressRepository';
import { asyncKeyValueStore } from '../data/stores';
import { createGameStore } from './gameStore';

/** Repositorios de la app. Para pasar a la nube, aquí se cambia la implementación. */
export const progressRepository = new LocalProgressRepository(asyncKeyValueStore);
export const profileRepository = new LocalProfileRepository(asyncKeyValueStore);

export const useGameStore = createGameStore(progressRepository, profileRepository);

export type { CreateProfileResult, GameState } from './gameStore';
