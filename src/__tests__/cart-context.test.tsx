import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { CartProvider, useCart } from '@/context/CartContext';
import { addCartItem, getActiveCart } from '@/services/cart.service';
import type { Product } from '@/types/product';

const mockAuth = { user: null as null | { id: string; isGuest?: boolean }, ensureSession: jest.fn() };
const mockTable = { journey: null as null | { tableId: string } };

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/context/StorefrontContext', () => ({ useStorefront: () => ({ branch: { id: 'br1' } }) }));
jest.mock('@/context/TableContext', () => ({ useTable: () => mockTable }));
jest.mock('@/services/cart.service', () => ({
  ...jest.requireActual('@/services/cart.service'),
  getActiveCart: jest.fn(),
  addCartItem: jest.fn(),
  setCartItemQty: jest.fn(),
  removeCartItem: jest.fn(),
}));

const latte: Product = { id: 'p1', categoryId: 'c', name: 'Latte', description: null, price: '3.90', isActive: true };
const remoteCart = {
  id: 'cart1',
  brandId: 'b',
  branchId: 'br1',
  items: [{ id: 'i1', productId: 'p1', productName: 'Latte', price: 3.9, qty: 1, imgUrl: null }],
};

type CartValue = ReturnType<typeof useCart>;
let cart: CartValue;
const capture = (value: CartValue) => {
  cart = value;
};
function Probe({ onRender }: { onRender: (value: CartValue) => void }) {
  onRender(useCart());
  return null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockAuth.user = null;
  mockTable.journey = null;
  (getActiveCart as jest.Mock).mockResolvedValue(null);
  (addCartItem as jest.Mock).mockResolvedValue(remoteCart);
});

it('keeps a signed-out cart on the phone without calling the API', async () => {
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await act(() => cart.add(latte, [], {}, 2, ''));
  expect(addCartItem).not.toHaveBeenCalled();
  expect(cart.summary).toMatchObject({ count: 2, total: 7.8 });
  expect(await AsyncStorage.getItem('brand-scoped:guest-cart')).toContain('"branchId":"br1"');
});

it('adds to the API cart when signed in', async () => {
  mockAuth.user = { id: 'u1' };
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(getActiveCart).toHaveBeenCalledWith('br1'));
  await act(() => cart.add(latte, [], {}, 1, 'hot'));
  expect(addCartItem).toHaveBeenCalledWith({ productId: 'p1', qty: 1, note: 'hot' }, 'br1');
  expect(cart.cartId).toBe('cart1');
  expect(cart.lines[0]).toMatchObject({ id: 'i1', name: 'Latte', qty: 1 });
});

it('replays signed-out lines into the API cart after sign-in', async () => {
  await AsyncStorage.setItem(
    'brand-scoped:guest-cart',
    JSON.stringify({ branchId: 'br1', lines: [{ id: 'g1', productId: 'p1', name: 'Latte', imageUrl: null, qty: 2, unitPrice: 3.9, lineTotal: 7.8, optionsText: '', note: null, request: { productId: 'p1', qty: 2 } }] }),
  );
  mockAuth.user = { id: 'u1' };
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(addCartItem).toHaveBeenCalledWith({ productId: 'p1', qty: 2 }, 'br1'));
  await waitFor(() => expect(AsyncStorage.getItem('brand-scoped:guest-cart')).resolves.toBeNull());
});

it('opens a guest session for a table order', async () => {
  mockTable.journey = { tableId: 't1' };
  mockAuth.ensureSession.mockResolvedValue({ id: 'guest', isGuest: true });
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await act(() => cart.add(latte, [], {}, 1, ''));
  expect(mockAuth.ensureSession).toHaveBeenCalled();
  expect(addCartItem).toHaveBeenCalledWith({ productId: 'p1', qty: 1 }, 'br1');
});

const storedLine = { id: 'g1', productId: 'p1', name: 'Latte', imageUrl: null, qty: 2, unitPrice: 3.9, lineTotal: 7.8, optionsText: '', note: null, request: { productId: 'p1', qty: 2 } };

it("carries a table guest's cart over when the guest signs in as a member", async () => {
  mockAuth.user = { id: 'guest', isGuest: true };
  (getActiveCart as jest.Mock).mockResolvedValue(remoteCart);
  const view = await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(cart.cartId).toBe('cart1'));
  (getActiveCart as jest.Mock).mockResolvedValue(null);
  mockAuth.user = { id: 'member' };
  await view.rerender(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(addCartItem).toHaveBeenCalledWith({ productId: 'p1', qty: 1 }, 'br1'));
});

it('does not carry over a table guest cart that was already paid', async () => {
  mockAuth.user = { id: 'guest', isGuest: true };
  (getActiveCart as jest.Mock).mockResolvedValue(remoteCart);
  const view = await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(cart.cartId).toBe('cart1'));
  // The order closed the cart.
  (getActiveCart as jest.Mock).mockResolvedValue(null);
  await act(() => cart.reload());
  expect(cart.cartId).toBeNull();
  mockAuth.user = { id: 'member' };
  await view.rerender(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(getActiveCart).toHaveBeenCalledTimes(3));
  expect(addCartItem).not.toHaveBeenCalled();
});

it('opens the table guest session for lines added before the table scan', async () => {
  await AsyncStorage.setItem('brand-scoped:guest-cart', JSON.stringify({ branchId: 'br1', lines: [storedLine] }));
  mockTable.journey = { tableId: 't1' };
  mockAuth.ensureSession.mockResolvedValue({ id: 'guest', isGuest: true });
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(mockAuth.ensureSession).toHaveBeenCalledTimes(1));
});

it('leaves a signed-out cart alone away from a table', async () => {
  await AsyncStorage.setItem('brand-scoped:guest-cart', JSON.stringify({ branchId: 'br1', lines: [storedLine] }));
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(cart.summary.count).toBe(2));
  expect(mockAuth.ensureSession).not.toHaveBeenCalled();
});
