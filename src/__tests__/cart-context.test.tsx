import { act, render, waitFor } from '@testing-library/react-native';
import { CartProvider, useCart } from '@/context/CartContext';
import { addCartItem, getActiveCart } from '@/services/cart.service';
import type { Product } from '@/types/product';

const mockAuth = { user: null as null | { id: string }, isMember: false };

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/context/StorefrontContext', () => ({ useStorefront: () => ({ branch: { id: 'br1' } }) }));
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

const signIn = () => {
  mockAuth.user = { id: 'u1' };
  mockAuth.isMember = true;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.user = null;
  mockAuth.isMember = false;
  (getActiveCart as jest.Mock).mockResolvedValue(null);
  (addCartItem as jest.Mock).mockResolvedValue(remoteCart);
});

it('has no cart and never calls the API while signed out', async () => {
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await expect(cart.add(latte, [], {}, 1, '')).rejects.toThrow('SIGN_IN_REQUIRED');
  expect(addCartItem).not.toHaveBeenCalled();
  expect(getActiveCart).not.toHaveBeenCalled();
  expect(cart.lines).toEqual([]);
});

it("loads the member's cart and adds to it", async () => {
  signIn();
  await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(getActiveCart).toHaveBeenCalledWith('br1'));
  await act(() => cart.add(latte, [], {}, 1, 'hot'));
  expect(addCartItem).toHaveBeenCalledWith({ productId: 'p1', qty: 1, note: 'hot' }, 'br1');
  expect(cart.cartId).toBe('cart1');
  expect(cart.lines[0]).toMatchObject({ id: 'i1', name: 'Latte', qty: 1 });
});

it('hides the previous cart after sign-out', async () => {
  signIn();
  (getActiveCart as jest.Mock).mockResolvedValue(remoteCart);
  const view = await render(<CartProvider><Probe onRender={capture} /></CartProvider>);
  await waitFor(() => expect(cart.cartId).toBe('cart1'));
  mockAuth.user = null;
  mockAuth.isMember = false;
  await view.rerender(<CartProvider><Probe onRender={capture} /></CartProvider>);
  expect(cart.cartId).toBeNull();
  expect(cart.lines).toEqual([]);
});
