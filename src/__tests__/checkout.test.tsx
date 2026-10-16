import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import CheckoutScreen from '@/app/checkout';
import { getPendingPayment } from '@/lib/pending-payment';
import { createTablePayLaterOrder, getBranchAvailability, initializePayment } from '@/services/order.service';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockReload = jest.fn().mockResolvedValue(undefined);
const mockTable = { journey: null as null | object };
const branch = {
  id: 'br1',
  name: 'Richmond',
  currency: 'GBP',
  order_type_settings: { pickup: { isActive: true }, scheduledPickup: { isActive: true }, delivery: { isActive: false } },
  payment_settings: { onlineMethods: { card: { isActive: true } }, offlineMethods: { cash: { isActive: true }, cardOnDelivery: { isActive: false } } },
};

jest.mock('expo-router', () => ({
  router: { push: (p: unknown) => mockPush(p), replace: (p: unknown) => mockReplace(p), back: jest.fn() },
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(fn, [fn]);
  },
}));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/context/BrandContext', () => ({
  useBrand: () => ({ brand: { brandId: 'b1', primaryDomain: 'order.dharmacoffee.uk', currency: 'GBP' } }),
}));
jest.mock('@/context/StorefrontContext', () => ({ useStorefront: () => ({ branch, menu: { currency: 'GBP' } }) }));
jest.mock('@/context/TableContext', () => ({ useTable: () => mockTable }));
jest.mock('@/context/CartContext', () => ({
  useCart: () => ({
    lines: [{ id: 'i1', productId: 'p1', name: 'Latte', imageUrl: null, qty: 2, unitPrice: 3.9, lineTotal: 7.8, optionsText: '', note: null }],
    summary: { count: 2, subtotal: 7.8, discount: 0, total: 7.8 },
    cartId: 'cart1',
    reload: mockReload,
  }),
}));
jest.mock('@/services/order.service', () => ({
  getBranchAvailability: jest.fn(),
  getFulfillmentSlots: jest.fn().mockResolvedValue({ available: true, dates: [{ date: 'Today', slots: [{ label: '10:00', value: 'slot-10' }] }] }),
  getAddresses: jest.fn().mockResolvedValue([]),
  setActiveAddress: jest.fn(),
  initializePayment: jest.fn(),
  createTablePayLaterOrder: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockTable.journey = null;
  (getBranchAvailability as jest.Mock).mockResolvedValue({ canAcceptOrders: true, reason: null });
});

it('pays by card: initializes payment for pickup and opens the provider page', async () => {
  (initializePayment as jest.Mock).mockResolvedValue({ paymentId: 'pay1', paymentUrl: 'https://pay.example/1' });
  await render(<CheckoutScreen />);
  await fireEvent.press(screen.getByText('Continue to payment  ·  £7.80'));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/payment'));
  expect(initializePayment).toHaveBeenCalledWith(
    { cartId: 'cart1', branchId: 'br1', paymentMethod: 'ONLINE_CARD', orderType: 'PICKUP', note: '' },
    'order.dharmacoffee.uk',
  );
  expect(getPendingPayment()).toMatchObject({ paymentId: 'pay1', paymentUrl: 'https://pay.example/1', cartId: 'cart1' });
});

it('places a cash pickup order straight to the confirmation', async () => {
  (initializePayment as jest.Mock).mockResolvedValue({ paymentId: 'pay2', orderId: 'o2' });
  await render(<CheckoutScreen />);
  await fireEvent.press(screen.getByText('Cash'));
  await fireEvent.press(screen.getByText('Place order  ·  £7.80'));
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: 'o2', branchId: 'br1', placed: '1' } }),
  );
  expect(mockReload).toHaveBeenCalled();
});

it('requires a time for scheduled pickup and sends the chosen slot', async () => {
  (initializePayment as jest.Mock).mockResolvedValue({ paymentId: 'pay3', paymentUrl: 'https://pay.example/3' });
  await render(<CheckoutScreen />);
  await fireEvent.press(screen.getByText('Scheduled pickup'));
  await fireEvent.press(screen.getByText('Continue to payment  ·  £7.80'));
  expect(screen.getByText('Choose a time.')).toBeTruthy();
  await fireEvent.press(await screen.findByText('10:00'));
  await fireEvent.press(screen.getByText('Continue to payment  ·  £7.80'));
  await waitFor(() => expect(initializePayment).toHaveBeenCalledWith(expect.objectContaining({ orderType: 'SCHEDULED_PICKUP', scheduledFor: 'slot-10' }), 'order.dharmacoffee.uk'));
});

it('stops when the branch is not taking orders', async () => {
  (getBranchAvailability as jest.Mock).mockResolvedValue({ canAcceptOrders: false, reason: 'MANUALLY_CLOSED' });
  await render(<CheckoutScreen />);
  await fireEvent.press(screen.getByText('Continue to payment  ·  £7.80'));
  expect(await screen.findByText("This branch isn't taking orders right now.")).toBeTruthy();
  expect(initializePayment).not.toHaveBeenCalled();
});

it('opens a pay-later order at the table', async () => {
  mockTable.journey = { tableId: 't1', tableLabel: '4', checkoutOptions: { payNow: true, payLater: true } };
  (createTablePayLaterOrder as jest.Mock).mockResolvedValue({ id: 'o9', totalPrice: '7.8' });
  await render(<CheckoutScreen />);
  await fireEvent.press(screen.getByText('Pay at the end'));
  await fireEvent.press(screen.getByText('Place order  ·  £7.80'));
  await waitFor(() => expect(createTablePayLaterOrder).toHaveBeenCalledWith({ cartId: 'cart1', tableId: 't1', branchId: 'br1', note: '' }));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: 'o9', branchId: 'br1', placed: '1' } });
});
