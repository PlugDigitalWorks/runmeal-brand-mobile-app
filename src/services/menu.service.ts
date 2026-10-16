import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

/** Minimal menu shape for the verification screen; the storefront plan extends it. */
export interface BrandMenu {
  brandId: string;
  categories: { id: string; name: string }[];
}

export async function getBrandMenu(brandId: string): Promise<BrandMenu> {
  const { data } = await api.get<ApiResponse<BrandMenu>>(`/brands/${brandId}/menu`);
  return data.data;
}
