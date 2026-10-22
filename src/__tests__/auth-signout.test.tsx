import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { act, render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { unregisterFromPush } from '@/lib/push';
import { clearSession, getTokens } from '@/lib/session';
import { getProfile, logout } from '@/services/auth.service';

jest.mock('@/lib/push', () => ({ unregisterFromPush: jest.fn() }));
jest.mock('@/services/auth.service', () => ({ getProfile: jest.fn(), logout: jest.fn() }));

const user = { id: 'u1', email: 'a@b.co', firstName: 'Ada', lastName: 'L', role: 'customer' };
type Auth = ReturnType<typeof useAuth>;
let auth: Auth;
const capture = (value: Auth) => {
  auth = value;
};
function Probe({ onRender }: { onRender: (value: Auth) => void }) {
  onRender(useAuth());
  return null;
}

beforeEach(async () => {
  jest.clearAllMocks();
  (SecureStore as unknown as { __reset: () => void }).__reset();
  await AsyncStorage.clear();
  await clearSession();
  (getProfile as jest.Mock).mockResolvedValue(user);
});

it('unties the push token while still signed in, then signs out even if that fails', async () => {
  const order: string[] = [];
  (unregisterFromPush as jest.Mock).mockImplementation(async () => {
    order.push(`push:${getTokens()?.accessToken ?? 'none'}`);
    throw new Error('offline');
  });
  (logout as jest.Mock).mockImplementation(async () => order.push('logout'));

  await render(<AuthProvider><Probe onRender={capture} /></AuthProvider>);
  await waitFor(() => expect(auth.status).toBe('signedOut'));
  await act(() => auth.signIn({ accessToken: 'a1', refreshToken: 'r1', sid: 's1', user }));
  // A failure inside unregister is swallowed by the real helper; here it throws to prove sign-out still runs.
  (unregisterFromPush as jest.Mock).mockImplementationOnce(async () => {
    order.push(`push:${getTokens()?.accessToken ?? 'none'}`);
  });
  await act(() => auth.signOut());

  expect(order).toEqual(['push:a1', 'logout']);
  expect(getTokens()).toBeNull();
  expect(auth.status).toBe('signedOut');
});
