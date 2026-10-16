import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rm_device_id';
let cached: string | null = null;

/** Lets the backend bind one refresh session per install (same contract as brandfe). */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const stored = await AsyncStorage.getItem(KEY);
  if (stored) return (cached = stored);
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(KEY, id);
  return (cached = id);
}
