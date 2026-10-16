import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse, SessionTokens, User } from '@/types/auth';

/** Tokens live in the Keychain / Keystore; the profile is not secret and stays in AsyncStorage. */
const TOKENS_KEY = 'rm_session';
const USER_KEY = 'rm_user';

let tokens: SessionTokens | null = null;

/** Read synchronously by the axios interceptor. */
export function getAccessToken(): string | null {
  return tokens?.accessToken ?? null;
}

export function getTokens(): SessionTokens | null {
  return tokens;
}

export async function loadSession(): Promise<{ tokens: SessionTokens | null; user: User | null }> {
  const [rawTokens, rawUser] = await Promise.all([SecureStore.getItemAsync(TOKENS_KEY), AsyncStorage.getItem(USER_KEY)]);
  try {
    tokens = rawTokens ? (JSON.parse(rawTokens) as SessionTokens) : null;
  } catch {
    tokens = null;
  }
  let user: User | null = null;
  try {
    user = rawUser ? (JSON.parse(rawUser) as User) : null;
  } catch {
    user = null;
  }
  return { tokens, user: tokens ? user : null };
}

export async function saveSession({ user, ...next }: AuthResponse): Promise<void> {
  tokens = { accessToken: next.accessToken, refreshToken: next.refreshToken, sid: next.sid };
  await Promise.all([
    SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens)),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

/** A refresh may or may not rotate the refresh token and sid; keep what it does not send. */
export async function saveTokens(next: SessionTokens): Promise<void> {
  tokens = {
    accessToken: next.accessToken,
    refreshToken: next.refreshToken ?? tokens?.refreshToken,
    sid: next.sid ?? tokens?.sid,
  };
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  tokens = null;
  await Promise.all([SecureStore.deleteItemAsync(TOKENS_KEY), AsyncStorage.removeItem(USER_KEY)]);
}
