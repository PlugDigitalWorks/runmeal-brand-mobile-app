import { api } from '@/lib/api';
import { unwrap } from '@/lib/unwrap';
import type { ApiResponse } from '@/types/api';
import type {
  Address,
  BranchAvailability,
  CreateAddressInput,
  FulfillmentSlotsResponse,
  InitializePaymentInput,
  Order,
  OrderDetails,
  PaymentInitializationResponse,
  ScheduledOrderType,
  TableOrderView,
} from '@/types/order';

const branchHeaders = (branchId: string) => ({ 'x-branch-id': branchId });

/**
 * POST /payments/initialize. The API builds the provider's return URL from the
 * request Origin, so the app sends its cafe's host and the payment ends on that
 * host's /payment/callback, which the payment screen intercepts.
 */
export async function initializePayment(input: InitializePaymentInput, cafeHost: string): Promise<PaymentInitializationResponse> {
  const origin = `https://${cafeHost}`;
  const { data } = await api.post<ApiResponse<PaymentInitializationResponse>>(
    '/payments/initialize',
    {
      cartId: input.cartId,
      paymentMethod: input.paymentMethod,
      orderType: input.orderType,
      ...(input.orderType === 'TABLE_ORDER' && input.tableId ? { tableId: input.tableId } : {}),
      ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
      creditUsedAmount: 0,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    },
    { headers: { ...branchHeaders(input.branchId), Origin: origin, Referer: `${origin}/` } },
  );
  return data.data;
}

export async function createTablePayLaterOrder(
  input: { cartId: string; tableId: string; branchId: string; note?: string },
): Promise<TableOrderView> {
  const { data } = await api.post<ApiResponse<TableOrderView>>(
    '/orders/table/pay-later',
    { cartId: input.cartId, tableId: input.tableId, ...(input.note?.trim() ? { note: input.note.trim() } : {}) },
    { headers: branchHeaders(input.branchId) },
  );
  return data.data;
}

export async function getMyOrders(): Promise<Order[]> {
  const { data } = await api.get<ApiResponse<Order[] | { data: Order[] }>>('/orders/customer');
  const payload = data.data;
  return Array.isArray(payload) ? payload : (payload?.data ?? []);
}

export async function getOrder(orderId: string, branchId: string, brandId: string): Promise<OrderDetails> {
  const { data } = await api.get<ApiResponse<OrderDetails>>(`/orders/${orderId}`, {
    headers: { ...branchHeaders(branchId), 'x-brand-id': brandId },
  });
  return data.data;
}

export async function getBranchAvailability(branchId: string): Promise<BranchAvailability> {
  const { data } = await api.get<ApiResponse<BranchAvailability>>(`/branches/${encodeURIComponent(branchId)}/availability`);
  return data.data;
}

export async function getFulfillmentSlots(branchId: string, orderType: ScheduledOrderType): Promise<FulfillmentSlotsResponse> {
  const { data } = await api.get<ApiResponse<FulfillmentSlotsResponse>>(
    `/branches/${encodeURIComponent(branchId)}/fulfillment-slots`,
    { params: { orderType } },
  );
  return data.data;
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await api.get<ApiResponse<Address[] | { data: Address[] }>>('/addresses');
  const payload = unwrap(data) as Address[] | { data: Address[] };
  return Array.isArray(payload) ? payload : (payload?.data ?? []);
}

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const { data } = await api.post<ApiResponse<Address>>('/addresses', input);
  return data.data;
}

/** Delivery goes to the active address; initialize payment carries no address id. */
export async function setActiveAddress(addressId: string): Promise<void> {
  await api.patch(`/addresses/${addressId}/set-active`);
}
