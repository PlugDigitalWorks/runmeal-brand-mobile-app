import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api } from '../api';
import { saveActiveBrand } from '../brand-store';

type Handler = { fulfilled: (c: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> };

async function runInterceptors(): Promise<InternalAxiosRequestConfig> {
  const { handlers } = api.interceptors.request as unknown as { handlers: Handler[] };
  let config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  for (const handler of handlers) config = await handler.fulfilled(config);
  return config;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('sends body auth mode and a stable device id on every request', async () => {
  const first = await runInterceptors();
  const second = await runInterceptors();
  expect(api.defaults.headers['x-auth-mode']).toBe('body');
  expect(first.headers['x-device-id']).toEqual(expect.any(String));
  expect(second.headers['x-device-id']).toBe(first.headers['x-device-id']);
});

it('adds x-brand-id once a cafe is selected', async () => {
  await saveActiveBrand({
    brandId: 'brand-1',
    slug: 'a',
    name: 'A',
    logoUrl: null,
    currency: 'TRY',
    currencySymbol: '₺',
    primaryDomain: 'a.runmeal.com',
    defaultDomain: 'a.runmeal.com',
  });
  const config = await runInterceptors();
  expect(config.headers['x-brand-id']).toBe('brand-1');
});
