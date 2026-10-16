import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { Menu, Product } from '@/types/product';

/** Branch prices when a branch is chosen, the brand menu otherwise (as ProductList does). */
export async function getMenu(brandId: string, branchId: string | null): Promise<Menu> {
  const path = branchId ? `/branches/${branchId}/menu` : `/brands/${brandId}/menu`;
  const { data } = await api.get<ApiResponse<Menu>>(path);
  return data.data;
}

export async function getProduct(productId: string, branchId: string | null): Promise<Product> {
  const { data } = await api.get<ApiResponse<Product>>(`/products/${productId}`, {
    headers: branchId ? { 'x-branch-id': branchId } : undefined,
  });
  return data.data;
}
