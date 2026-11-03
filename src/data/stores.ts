import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from './ProgressRepository';

/** Almacén persistente real (dispositivo). Funciona también en Expo Go. */
export const asyncKeyValueStore: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
