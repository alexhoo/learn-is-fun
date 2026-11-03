import { emptyProgress, reduceProgress, replay } from '../domain/progress';
import type { DomainEvent, Progress } from '../domain/types';
import type { KeyValueStore, ProgressRepository } from './ProgressRepository';

type StoredLog = { events: DomainEvent[]; synced: string[] };

const progressKey = (profileId: string) => `progress:${profileId}`;
const logKey = (profileId: string) => `events:${profileId}`;

/**
 * Repositorio local-first. Guarda dos cosas:
 *  - el registro de eventos (fuente de verdad, lo que se sincronizará con la nube)
 *  - una instantánea del progreso (lectura rápida)
 * Si la instantánea falta o está corrupta, se reconstruye reproduciendo los eventos.
 */
export class LocalProgressRepository implements ProgressRepository {
  constructor(private readonly store: KeyValueStore) {}

  async getProgress(profileId: string): Promise<Progress> {
    const raw = await this.store.getItem(progressKey(profileId));
    if (raw) {
      try {
        return JSON.parse(raw) as Progress;
      } catch {
        // instantánea dañada: se reconstruye abajo
      }
    }
    const log = await this.readLog(profileId);
    if (log.events.length === 0) return emptyProgress();
    const rebuilt = replay(log.events);
    await this.store.setItem(progressKey(profileId), JSON.stringify(rebuilt));
    return rebuilt;
  }

  async appendEvent(profileId: string, event: DomainEvent): Promise<Progress> {
    const log = await this.readLog(profileId);
    if (log.events.some((e) => e.id === event.id)) return this.getProgress(profileId); // idempotente
    const current = await this.getProgress(profileId);
    const next = reduceProgress(current, event);
    log.events.push(event);
    await this.store.setItem(logKey(profileId), JSON.stringify(log));
    await this.store.setItem(progressKey(profileId), JSON.stringify(next));
    return next;
  }

  async getPendingEvents(profileId: string): Promise<DomainEvent[]> {
    const log = await this.readLog(profileId);
    const synced = new Set(log.synced);
    return log.events.filter((e) => !synced.has(e.id));
  }

  async markSynced(profileId: string, eventIds: string[]): Promise<void> {
    const log = await this.readLog(profileId);
    log.synced = Array.from(new Set([...log.synced, ...eventIds]));
    await this.store.setItem(logKey(profileId), JSON.stringify(log));
  }

  async deleteProfileData(profileId: string): Promise<void> {
    await this.store.removeItem(progressKey(profileId));
    await this.store.removeItem(logKey(profileId));
  }

  private async readLog(profileId: string): Promise<StoredLog> {
    const raw = await this.store.getItem(logKey(profileId));
    if (!raw) return { events: [], synced: [] };
    try {
      return JSON.parse(raw) as StoredLog;
    } catch {
      return { events: [], synced: [] };
    }
  }
}
