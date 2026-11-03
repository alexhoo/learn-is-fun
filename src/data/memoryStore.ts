import type { KeyValueStore } from './ProgressRepository';

/** Almacén en memoria para pruebas (no depende de módulos nativos). */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  async removeItem(key: string) {
    this.data.delete(key);
  }
}
