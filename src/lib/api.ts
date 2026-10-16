import axios from 'axios';
import { API_URL } from '@/config';
import { getBrandId } from './brand-store';
import { getDeviceId } from './device-id';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-auth-mode': 'body',
  },
});

api.interceptors.request.use(async (config) => {
  const brandId = getBrandId();
  if (brandId) config.headers['x-brand-id'] = brandId;
  config.headers['x-device-id'] = await getDeviceId();
  return config;
});
