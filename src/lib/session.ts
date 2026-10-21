import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse, SessionTokens, User } from '@/types/auth';

/** Tokens live in the Keychain / Keystore; the profile is not secret and stays in AsyncStorage. */
const TOKENS_KEY = 'rm_session';
const USER_KEY = 'rm_user';

let tokens: SessionTokens | null = null;
/**
 * Bumped by every sign-in and sign-out. Work that started under one session
 * (a token refresh, a profile fetch) checks it before writing, so a response
 * that lands after sign-out or account deletion cannot bring the old session back.
 */
let generation = 0;

export function getSessionGeneration(): number {
  return generation;
}

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
  if (tokens && !user) {
    // A half-written session would send a bearer token while the UI shows signed out.
    await clearSession();
    return { tokens: null, user: null };
  }
  return { tokens, user: tokens ? user : null };
}

export async function saveSession({ user, ...next }: AuthResponse): Promise<void> {
  generation += 1;
  tokens = { accessToken: next.accessToken, refreshToken: next.refreshToken, sid: next.sid };
  await Promise.all([
    SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens)),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

/**
 * A refresh may or may not rotate the refresh token and sid; keep what it does not send.
 * With `forGeneration`, writes only if that session is still the current one; returns whether it wrote.
 */
export async function saveTokens(next: SessionTokens, forGeneration?: number): Promise<boolean> {
  if (forGeneration !== undefined && (forGeneration !== generation || !tokens)) return false;
  tokens = {
    accessToken: next.accessToken,
    refreshToken: next.refreshToken ?? tokens?.refreshToken,
    sid: next.sid ?? tokens?.sid,
  };
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  return true;
}

/** Stores a refreshed profile, unless the session it was fetched for has ended since. */
export async function saveUser(user: User, forGeneration = generation): Promise<boolean> {
  if (forGeneration !== generation || !tokens) return false;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return true;
}

export async function clearSession(): Promise<void> {
  generation += 1;
  tokens = null;
  await Promise.all([SecureStore.deleteItemAsync(TOKENS_KEY), AsyncStorage.removeItem(USER_KEY)]);
}
