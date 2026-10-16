import { render, screen } from '@testing-library/react-native';
import '@/i18n';
import OrdersScreen from '@/app/orders';
import { getMyOrders } from '@/services/order.service';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(fn, [fn]);
  },
}));
const mockBrand = { brand: { brandId: 'b1', currency: 'GBP' } };

jest.mock('@/context/BrandContext', () => ({ useBrand: () => mockBrand }));
jest.mock('@/services/order.service', () => ({ getMyOrders: jest.fn() }));

it("lists this cafe's orders, newest first", async () => {
  (getMyOrders as jest.Mock).mockResolvedValue([
    { id: 'o1', brandId: 'b1', branchId: 'br1', orderNumber: 11, status: 'COMPLETED', totalPrice: '4.2', createdAt: '2026-10-01T09:00:00Z' },
    { id: 'o2', brandId: 'other', branchId: 'br9', orderNumber: 99, status: 'COMPLETED', totalPrice: '1', createdAt: '2026-10-03T09:00:00Z' },
    { id: 'o3', brandId: 'b1', branchId: 'br1', orderNumber: 12, status: 'PREPARING', totalPrice: '7.8', createdAt: '2026-10-02T09:00:00Z' },
  ]);
  await render(<OrdersScreen />);
  const numbers = (await screen.findAllByText(/^Order #/)).map((node) => node.props.children);
  expect(numbers).toEqual(['Order #12', 'Order #11']);
});

it('says so when the orders could not load, instead of showing none', async () => {
  (getMyOrders as jest.Mock).mockRejectedValue(new Error('offline'));
  await render(<OrdersScreen />);
  expect(await screen.findByText("Couldn't load your orders. Pull down to try again.")).toBeTruthy();
  expect(screen.queryByText("You haven't ordered yet.")).toBeNull();
  expect(screen.getByText('Try again')).toBeTruthy();
});
