import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import ProductSheet from '@/app/product/[id]';
import { getProduct } from '@/services/menu.service';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockAdd = jest.fn();
const mockAuth = { isMember: false };
const mockStorefront = { branch: { id: 'br1' }, menu: { currency: 'GBP' } };
const mockBrand = { brand: { currency: 'GBP' } };
const mockCart = { add: (...args: unknown[]) => mockAdd(...args) };

jest.mock('expo-router', () => ({
  router: { push: (p: unknown) => mockPush(p), back: () => mockBack() },
  useLocalSearchParams: () => ({ id: 'p1' }),
}));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/context/BrandContext', () => ({ useBrand: () => mockBrand }));
jest.mock('@/context/StorefrontContext', () => ({ useStorefront: () => mockStorefront }));
jest.mock('@/context/CartContext', () => ({ useCart: () => mockCart }));
jest.mock('@/services/menu.service', () => ({ getProduct: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.isMember = false;
  mockAdd.mockResolvedValue(undefined);
  (getProduct as jest.Mock).mockResolvedValue({ id: 'p1', categoryId: 'c', name: 'Croissant', description: null, price: '3.10', isActive: true, optionGroups: [] });
});

it('shows the product to a signed-out customer but asks them to sign in on Add', async () => {
  await render(<ProductSheet />);
  await fireEvent.press(await screen.findByText(/Add to cart/));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/login', params: { reason: 'order' } });
  expect(mockAdd).not.toHaveBeenCalled();
});

it('adds the same choice once the customer has signed in', async () => {
  const view = await render(<ProductSheet />);
  await fireEvent.press(await screen.findByText(/Add to cart/));
  mockAuth.isMember = true;
  await view.rerender(<ProductSheet />);
  await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
  expect(mockAdd.mock.calls[0][0]).toMatchObject({ id: 'p1' });
  expect(mockAdd.mock.calls[0][3]).toBe(1);
});

it('adds straight away for a signed-in customer', async () => {
  mockAuth.isMember = true;
  await render(<ProductSheet />);
  await fireEvent.press(await screen.findByText(/Add to cart/));
  await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalled();
});
