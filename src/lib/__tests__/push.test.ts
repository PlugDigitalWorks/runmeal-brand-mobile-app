import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { onPushTokenChange, registerForPush, unregisterFromPush } from '../push';
import { registerExpoPushToken, removeExpoPushToken } from '@/services/notification.service';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {}, easConfig: null } }));
jest.mock('@/services/notification.service', () => ({ registerExpoPushToken: jest.fn(), removeExpoPushToken: jest.fn() }));
jest.mock('@/lib/brand-store', () => ({ ...jest.requireActual('@/lib/brand-store'), getBrandId: () => 'brand-1' }));

const device = Device as { isDevice: boolean };
const config = Constants as unknown as { expoConfig: { extra?: { eas?: { projectId?: string } } } };
const apiError = (status: number, code: string) => {
  const cfg = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('fail', String(status), cfg, undefined, { status, data: { code }, headers: {}, config: cfg, statusText: '' } as AxiosResponse);
};
const permission = (status: string) => (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status });
const tokens = (...values: string[]) =>
  values.forEach((data) => (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({ type: 'expo', data }));

beforeEach(async () => {
  jest.clearAllMocks();
  device.isDevice = true;
  config.expoConfig = { ...config.expoConfig, extra: { eas: { projectId: 'proj-1' } } };
  permission('granted');
  await unregisterFromPush();
  jest.clearAllMocks();
});

it('skips registration on a simulator', async () => {
  device.isDevice = false;
  expect(await registerForPush()).toBe('skipped');
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  expect(registerExpoPushToken).not.toHaveBeenCalled();
});

it('skips registration without permission or without the EAS project', async () => {
  permission('denied');
  expect(await registerForPush()).toBe('skipped');
  permission('granted');
  config.expoConfig = { extra: undefined };
  expect(await registerForPush()).toBe('skipped');
  expect(registerExpoPushToken).not.toHaveBeenCalled();
});

it("registers the Expo token with the app's brand", async () => {
  tokens('ExponentPushToken[a]');
  expect(await registerForPush()).toBe('registered');
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-1' });
  expect(registerExpoPushToken).toHaveBeenCalledWith('ExponentPushToken[a]', 'brand-1');
});

it('gets a fresh token and retries once on PUSH_TOKEN_INVALID, then gives up quietly', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  tokens('ExponentPushToken[old]', 'ExponentPushToken[new]');
  (registerExpoPushToken as jest.Mock)
    .mockRejectedValueOnce(apiError(400, 'PUSH_TOKEN_INVALID'))
    .mockRejectedValueOnce(apiError(400, 'PUSH_TOKEN_INVALID'));

  expect(await registerForPush()).toBe('failed');
  expect(registerExpoPushToken).toHaveBeenNthCalledWith(2, 'ExponentPushToken[new]', 'brand-1');
  expect(registerExpoPushToken).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenCalledWith('[push] registration failed (PUSH_TOKEN_INVALID)');
  expect(JSON.stringify(warn.mock.calls)).not.toContain('ExponentPushToken');
  warn.mockRestore();
});

it('reports a guest refusal so the screen can ask to sign in', async () => {
  (registerExpoPushToken as jest.Mock).mockRejectedValueOnce(apiError(403, 'PUSH_GUEST_NOT_ALLOWED'));
  expect(await registerForPush()).toBe('guest');
});

it('logs a brand that is missing or inactive without showing anything', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  (registerExpoPushToken as jest.Mock).mockRejectedValueOnce(apiError(404, 'BRAND_NOT_FOUND'));
  expect(await registerForPush()).toBe('failed');
  expect(warn).toHaveBeenCalledWith('[push] registration failed (BRAND_NOT_FOUND)');
  warn.mockRestore();
});

it('unties the registered token on sign-out, even when the API fails', async () => {
  tokens('ExponentPushToken[mine]');
  await registerForPush();
  (removeExpoPushToken as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await expect(unregisterFromPush()).resolves.toBeUndefined();
  expect(removeExpoPushToken).toHaveBeenCalledWith('ExponentPushToken[mine]');
});

it('calls back only when the OS reports a different device token, never for repeats', () => {
  const listener = jest.fn();
  const stop = onPushTokenChange(listener);
  const [[onToken]] = (Notifications.addPushTokenListener as jest.Mock).mock.calls;
  // Each token fetch reports the current token; registering on those would loop forever.
  onToken({ type: 'ios', data: 'device-a' });
  onToken({ type: 'ios', data: 'device-a' });
  onToken({ type: 'ios', data: 'device-a' });
  expect(listener).not.toHaveBeenCalled();
  onToken({ type: 'ios', data: 'device-b' });
  expect(listener).toHaveBeenCalledTimes(1);
  onToken({ type: 'ios', data: 'device-b' });
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
});

it('shares one registration between overlapping calls', async () => {
  let release: () => void = () => undefined;
  (registerExpoPushToken as jest.Mock).mockReturnValueOnce(new Promise<void>((resolve) => (release = resolve)));
  const first = registerForPush();
  const second = registerForPush();
  await Promise.resolve();
  release();
  expect(await first).toBe('registered');
  expect(await second).toBe('registered');
  expect(registerExpoPushToken).toHaveBeenCalledTimes(1);
});

it('logs why a token could not be fetched, without the token', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(new Error('no aps-environment for ExponentPushToken[x]'));
  expect(await registerForPush()).toBe('failed');
  expect(warn).toHaveBeenCalledWith('[push] registration failed (no aps-environment for ExponentPushToken[…])');
  warn.mockRestore();
});
