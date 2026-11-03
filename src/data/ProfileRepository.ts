import type { Profile } from '../domain/profile';
import type { KeyValueStore } from './ProgressRepository';

/** Acceso a los perfiles de niño. Hoy local; con cuenta en la nube, sincronizado. */
export interface ProfileRepository {
  list(): Promise<Profile[]>;
  save(profile: Profile): Promise<void>;
  remove(profileId: string): Promise<void>;
  getActiveId(): Promise<string | null>;
  setActiveId(profileId: string | null): Promise<void>;
}

const PROFILES_KEY = 'profiles';
const ACTIVE_KEY = 'activeProfile';

export class LocalProfileRepository implements ProfileRepository {
  constructor(private readonly store: KeyValueStore) {}

  async list(): Promise<Profile[]> {
    const raw = await this.store.getItem(PROFILES_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Profile[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async save(profile: Profile): Promise<void> {
    const all = await this.list();
    const next = all.some((p) => p.id === profile.id)
      ? all.map((p) => (p.id === profile.id ? profile : p))
      : [...all, profile];
    await this.store.setItem(PROFILES_KEY, JSON.stringify(next));
  }

  async remove(profileId: string): Promise<void> {
    const all = await this.list();
    await this.store.setItem(PROFILES_KEY, JSON.stringify(all.filter((p) => p.id !== profileId)));
    if ((await this.getActiveId()) === profileId) await this.setActiveId(null);
  }

  async getActiveId(): Promise<string | null> {
    return this.store.getItem(ACTIVE_KEY);
  }

  async setActiveId(profileId: string | null): Promise<void> {
    if (profileId === null) await this.store.removeItem(ACTIVE_KEY);
    else await this.store.setItem(ACTIVE_KEY, profileId);
  }
}
