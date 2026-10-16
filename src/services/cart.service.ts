import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { AddItemDto, Cart } from '@/types/cart';

const branchHeaders = (branchId: string) => ({ headers: { 'x-branch-id': branchId } });

/** `id` and `cartId` both occur in API responses; brandfe reads either. */
export const cartIdOf = (cart: Cart | null | undefined): string | null => cart?.id ?? cart?.cartId ?? null;

/**
 * The customer's open cart at this branch, if any. GET /carts lists bare cart
 * rows without items or totals, so the chosen one is read again through
 * GET /carts/:id, exactly like brandfe's refreshUserCart.
 */
export async function getActiveCart(branchId: string): Promise<Cart | null> {
  const { data } = await api.get<ApiResponse<Cart[] | null>>('/carts', branchHeaders(branchId));
  const row = (data.data ?? []).find((cart) => cart.branchId === branchId && cart.isActive !== false);
  const id = cartIdOf(row);
  if (!id) return null;
  const full = await api.get<ApiResponse<Cart>>(`/carts/${id}`, branchHeaders(branchId));
  return full.data.data;
}

export async function addCartItem(dto: AddItemDto, branchId: string): Promise<Cart> {
  const { data } = await api.post<ApiResponse<Cart>>('/carts/items', dto, branchHeaders(branchId));
  return data.data;
}

export async function setCartItemQty(itemId: string, qty: number, branchId: string): Promise<Cart> {
  const { data } = await api.patch<ApiResponse<Cart>>('/carts/items/qty', { itemId, qty }, branchHeaders(branchId));
  return data.data;
}

export async function removeCartItem(itemId: string, branchId: string): Promise<void> {
  await api.delete(`/carts/items/${itemId}`, branchHeaders(branchId));
}
