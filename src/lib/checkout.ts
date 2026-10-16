import type { Branch } from '@/types/branch';
import type { OrderType, PaymentMethod } from '@/types/order';

const ORDER_TYPE_SETTING: Record<Exclude<OrderType, 'TABLE_ORDER'>, keyof NonNullable<Branch['order_type_settings']>> = {
  DELIVERY: 'delivery',
  SCHEDULED_DELIVERY: 'scheduledDelivery',
  PICKUP: 'pickup',
  SCHEDULED_PICKUP: 'scheduledPickup',
};

/**
 * Storefront checkout offers what the branch enables; a scanned table orders to
 * the table or for pickup (brandfe's TableCheckoutPage).
 */
export function orderTypesFor(branch: Branch, atTable: boolean): OrderType[] {
  const settings = branch.order_type_settings ?? {};
  if (atTable) return ['TABLE_ORDER', 'PICKUP'];
  return (Object.keys(ORDER_TYPE_SETTING) as (keyof typeof ORDER_TYPE_SETTING)[]).filter(
    (type) => settings[ORDER_TYPE_SETTING[type]]?.isActive,
  );
}

/** brandfe's CheckoutPage rule: a missing setting counts as on; scheduled pickup is card-only. */
export function paymentMethodsFor(branch: Branch, orderType: OrderType): PaymentMethod[] {
  const settings = branch.payment_settings;
  const methods: PaymentMethod[] = [];
  if (settings?.onlineMethods?.card?.isActive ?? true) methods.push('ONLINE_CARD');
  if (orderType === 'SCHEDULED_PICKUP' || orderType === 'TABLE_ORDER') return methods;
  if (settings?.offlineMethods?.cash?.isActive ?? true) methods.push('CASH');
  if (settings?.offlineMethods?.cardOnDelivery?.isActive ?? true) methods.push('CARD_ON_DELIVERY');
  return methods;
}

export const isScheduled = (type: OrderType): type is 'SCHEDULED_DELIVERY' | 'SCHEDULED_PICKUP' =>
  type === 'SCHEDULED_DELIVERY' || type === 'SCHEDULED_PICKUP';

export const isDelivery = (type: OrderType) => type === 'DELIVERY' || type === 'SCHEDULED_DELIVERY';

export type PaymentCallback = { status: 'success' | 'failure'; paymentId: string | null; orderId: string | null };

/**
 * The API sends the provider's return to `{origin}/payment/callback?status=…`.
 * The app sends its cafe host as Origin, so the payment WebView ends there and
 * the app reads the result instead of loading brandfe.
 */
export function parsePaymentCallback(url: string): PaymentCallback | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.pathname.endsWith('/payment/callback')) return null;
  return {
    status: parsed.searchParams.get('status') === 'success' ? 'success' : 'failure',
    paymentId: parsed.searchParams.get('paymentId'),
    orderId: parsed.searchParams.get('orderId'),
  };
}
