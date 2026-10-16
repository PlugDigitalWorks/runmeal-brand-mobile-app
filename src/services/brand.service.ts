import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { AppBrand } from '@/types/brand';

/**
 * The backend resolves a brand from the request's Origin/Referer host
 * (production ignores `?host=`). A native app has no browser Origin, so it
 * sends the cafe's own web host explicitly.
 */
export async function resolveBrandByHost(host: string): Promise<AppBrand> {
  const origin = `https://${host}`;
  const { data } = await api.get<ApiResponse<AppBrand>>('/brands/resolve', {
    headers: { Origin: origin, Referer: `${origin}/` },
  });
  return data.data;
}
