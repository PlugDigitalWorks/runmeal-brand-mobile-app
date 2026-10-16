import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { api, onSessionExpired } from '../api';
import { clearSession, getTokens, saveSession } from '../session';

type Reply = { status: number; data: unknown };
const calls: InternalAxiosRequestConfig[] = [];
/** Authorization as it was sent: a retried request reuses and mutates the same config. */
const sentAuth: (string | undefined)[] = [];
let replies: ((config: InternalAxiosRequestConfig) => Reply)[] = [];

function respond(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  calls.push(config);
  sentAuth.push(AxiosHeaders.from(config.headers).get('Authorization') as string | undefined);
  const next = replies.shift();
  if (!next) throw new Error(`unexpected request ${config.url}`);
  const { status, data } = next(config);
  const response = { status, data, headers: {}, config, statusText: String(status) } as AxiosResponse;
  if (status >= 400) {
    return Promise.reject(new AxiosError('fail', String(status), config, undefined, response));
  }
  return Promise.resolve(response);
}

const user = { id: 'u1', email: 'a@b.co', firstName: 'Ada', lastName: 'L', role: 'CUSTOMER' };

beforeEach(async () => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  await clearSession();
  calls.length = 0;
  sentAuth.length = 0;
  replies = [];
  api.defaults.adapter = respond;
});

it('sends the bearer token and silently refreshes once on a 401', async () => {
  await saveSession({ accessToken: 'old', refreshToken: 'r1', sid: 's1', user });
  replies = [
    () => ({ status: 401, data: {} }),
    () => ({ status: 200, data: { status: true, data: { accessToken: 'new', refreshToken: 'r2', sid: 's1' } } }),
    () => ({ status: 200, data: { status: true, data: { ok: 1 } } }),
  ];

  const res = await api.get('/profile');

  expect(res.data.data).toEqual({ ok: 1 });
  expect(sentAuth[0]).toBe('Bearer old');
  expect(calls[1].url).toBe('/auth/refresh');
  expect(JSON.parse(calls[1].data as string)).toEqual({ client: 'user', refreshToken: 'r1', sid: 's1' });
  expect(sentAuth[1]).toBeUndefined();
  expect(sentAuth[2]).toBe('Bearer new');
  expect(getTokens()).toEqual({ accessToken: 'new', refreshToken: 'r2', sid: 's1' });
});

it('shares one refresh between parallel 401s', async () => {
  await saveSession({ accessToken: 'old', refreshToken: 'r1', sid: 's1', user });
  replies = [
    () => ({ status: 401, data: {} }),
    () => ({ status: 401, data: {} }),
    () => ({ status: 200, data: { status: true, data: { accessToken: 'new' } } }),
    () => ({ status: 200, data: { status: true, data: 'a' } }),
    () => ({ status: 200, data: { status: true, data: 'b' } }),
  ];
  await Promise.all([api.get('/carts'), api.get('/profile')]);
  expect(calls.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
});

it('signs out when the refresh itself is rejected', async () => {
  await saveSession({ accessToken: 'old', refreshToken: 'r1', sid: 's1', user });
  const expired = jest.fn();
  const unsubscribe = onSessionExpired(expired);
  replies = [() => ({ status: 401, data: {} }), () => ({ status: 401, data: {} })];

  await expect(api.get('/profile')).rejects.toBeInstanceOf(AxiosError);
  expect(expired).toHaveBeenCalledTimes(1);
  expect(getTokens()).toBeNull();
  unsubscribe();
});

it('keeps the session when the refresh fails for a network or server reason', async () => {
  await saveSession({ accessToken: 'old', refreshToken: 'r1', sid: 's1', user });
  const expired = jest.fn();
  const unsubscribe = onSessionExpired(expired);
  replies = [() => ({ status: 401, data: {} }), () => ({ status: 503, data: {} })];

  await expect(api.get('/profile')).rejects.toBeInstanceOf(AxiosError);
  expect(expired).not.toHaveBeenCalled();
  expect(getTokens()).toEqual({ accessToken: 'old', refreshToken: 'r1', sid: 's1' });
  unsubscribe();
});

it('does not try to refresh without a refresh token', async () => {
  replies = [() => ({ status: 401, data: {} })];
  await expect(api.get('/profile')).rejects.toBeInstanceOf(AxiosError);
  expect(calls).toHaveLength(1);
});
