import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { clearSession, getAccessToken, getTokens, loadSession, saveSession, saveTokens } from '../session';

const user = { id: 'u1', email: 'a@b.co', firstName: 'Ada', lastName: 'L', role: 'CUSTOMER' };

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  await AsyncStorage.clear();
  await clearSession();
});

it('keeps tokens in the secure store and survives a restart', async () => {
  await saveSession({ accessToken: 'a1', refreshToken: 'r1', sid: 's1', user });
  expect(getAccessToken()).toBe('a1');
  expect(await SecureStore.getItemAsync('rm_session')).toContain('r1');
  expect(await AsyncStorage.getItem('rm_session')).toBeNull();

  const restored = await loadSession();
  expect(restored).toEqual({ tokens: { accessToken: 'a1', refreshToken: 'r1', sid: 's1' }, user });
});

it('merges a refresh response, keeping the old refresh token when none is rotated', async () => {
  await saveSession({ accessToken: 'a1', refreshToken: 'r1', sid: 's1', user });
  await saveTokens({ accessToken: 'a2' });
  expect(getTokens()).toEqual({ accessToken: 'a2', refreshToken: 'r1', sid: 's1' });
  await saveTokens({ accessToken: 'a3', refreshToken: 'r2', sid: 's2' });
  expect((await loadSession()).tokens).toEqual({ accessToken: 'a3', refreshToken: 'r2', sid: 's2' });
});

it('drops tokens that have no stored user', async () => {
  await saveSession({ accessToken: 'a1', refreshToken: 'r1', sid: 's1', user });
  await AsyncStorage.removeItem('rm_user');
  expect(await loadSession()).toEqual({ tokens: null, user: null });
  expect(getAccessToken()).toBeNull();
  expect(await SecureStore.getItemAsync('rm_session')).toBeNull();
});

it('forgets everything on sign-out', async () => {
  await saveSession({ accessToken: 'a1', refreshToken: 'r1', sid: 's1', user });
  await clearSession();
  expect(getAccessToken()).toBeNull();
  expect(await loadSession()).toEqual({ tokens: null, user: null });
});
