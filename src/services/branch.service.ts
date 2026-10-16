import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { Branch } from '@/types/branch';

/** Public: every active branch of the brand (brandfe's getBrandBranches). */
export async function listBrandBranches(brandId: string): Promise<Branch[]> {
  const { data } = await api.get<ApiResponse<Branch[]>>('/branches/nearby/brand/all', { params: { brandId } });
  return data.data;
}
