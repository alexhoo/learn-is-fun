import type { DomainEvent, Progress } from '../domain/types';

/**
 * Único punto de acceso a la persistencia del progreso.
 * Hoy lo implementa el almacenamiento local; mañana se añade una versión en la nube
 * (Supabase) sin tocar pantallas ni máquinas.
 */
export interface ProgressRepository {
  getProgress(profileId: string): Promise<Progress>;
  /** Guarda el evento en el registro y devuelve el progreso resultante. */
  appendEvent(profileId: string, event: DomainEvent): Promise<Progress>;
  /** Eventos aún no sincronizados con la nube. */
  getPendingEvents(profileId: string): Promise<DomainEvent[]>;
  markSynced(profileId: string, eventIds: string[]): Promise<void>;
  /** Borra todo el progreso de un perfil (al eliminar el perfil). */
  deleteProfileData(profileId: string): Promise<void>;
}

/** Almacén clave-valor mínimo: AsyncStorage hoy, MMKV o SQLite mañana. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
