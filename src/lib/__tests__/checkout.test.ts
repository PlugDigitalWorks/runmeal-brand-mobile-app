import type { Branch } from '@/types/branch';
import { orderTypesFor, parsePaymentCallback, paymentMethodsFor } from '../checkout';

const branch = (settings: Partial<Branch>): Branch => ({
  id: 'br',
  name: 'Richmond',
  slug: 'richmond',
  addressText: null,
  logoUrl: null,
  bannerUrls: null,
  locationGeog: null,
  currency: 'GBP',
  currencySymbol: '£',
  distanceM: null,
  ...settings,
});

const dharma = branch({
  order_type_settings: {
    pickup: { isActive: true },
    delivery: { isActive: false },
    scheduledPickup: { isActive: true },
    scheduledDelivery: { isActive: false },
    tableOrder: { isActive: true },
  },
  payment_settings: { onlineMethods: { card: { isActive: true } }, offlineMethods: { cash: { isActive: false }, cardOnDelivery: { isActive: false } } },
});

it('offers the order types the branch enables, in brandfe order', () => {
  expect(orderTypesFor(dharma, null)).toEqual(['PICKUP', 'SCHEDULED_PICKUP']);
  const all = branch({
    order_type_settings: { pickup: { isActive: true }, delivery: { isActive: true }, scheduledDelivery: { isActive: true }, scheduledPickup: { isActive: false } },
  });
  expect(orderTypesFor(all, null)).toEqual(['DELIVERY', 'SCHEDULED_DELIVERY', 'PICKUP']);
});

it('orders at the table only when the table allows paying, plus pickup when the branch has it', () => {
  expect(orderTypesFor(dharma, { payNow: true, payLater: false })).toEqual(['TABLE_ORDER', 'PICKUP']);
  expect(orderTypesFor(dharma, { payNow: false, payLater: false })).toEqual(['PICKUP']);
  const noPickup = branch({ order_type_settings: { pickup: { isActive: false } } });
  expect(orderTypesFor(noPickup, { payNow: false, payLater: true })).toEqual(['TABLE_ORDER']);
});

it('pays every table-journey order by card, as brandfe does', () => {
  const open = branch({ payment_settings: { offlineMethods: { cash: { isActive: true } } } });
  expect(paymentMethodsFor(open, 'PICKUP', true)).toEqual(['ONLINE_CARD']);
  expect(paymentMethodsFor(open, 'TABLE_ORDER', true)).toEqual(['ONLINE_CARD']);
});

it('offers payment methods per branch settings, card only for scheduled pickup', () => {
  const open = branch({ payment_settings: { onlineMethods: { card: { isActive: true } }, offlineMethods: { cash: { isActive: true }, cardOnDelivery: { isActive: true } } } });
  expect(paymentMethodsFor(open, 'PICKUP')).toEqual(['ONLINE_CARD', 'CASH', 'CARD_ON_DELIVERY']);
  expect(paymentMethodsFor(open, 'SCHEDULED_PICKUP')).toEqual(['ONLINE_CARD']);
  expect(paymentMethodsFor(dharma, 'PICKUP')).toEqual(['ONLINE_CARD']);
  expect(paymentMethodsFor(branch({}), 'DELIVERY')).toEqual(['ONLINE_CARD', 'CASH', 'CARD_ON_DELIVERY']);
});

it('reads the provider redirect back to the storefront callback', () => {
  expect(parsePaymentCallback('https://order.dharmacoffee.uk/payment/callback?status=success&paymentId=pay1&orderId=o1')).toEqual({
    status: 'success',
    paymentId: 'pay1',
    orderId: 'o1',
  });
  expect(parsePaymentCallback('https://order.dharmacoffee.uk/payment/callback?status=failure&paymentId=pay1')).toEqual({
    status: 'failure',
    paymentId: 'pay1',
    orderId: null,
  });
  expect(parsePaymentCallback('https://checkout.stripe.com/pay/cs_1')).toBeNull();
  expect(parsePaymentCallback('not a url')).toBeNull();
});
