import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { TableResolveResponse } from '@/types/table';

export async function resolveQr(qrToken: string): Promise<TableResolveResponse> {
  const { data } = await api.get<ApiResponse<TableResolveResponse>>(
    `/tables/resolve/${encodeURIComponent(qrToken)}`,
  );
  return data.data;
}
