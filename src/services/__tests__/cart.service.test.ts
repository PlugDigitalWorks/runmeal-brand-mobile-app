import { api } from '@/lib/api';
import { addCartItem, cartIdOf, getActiveCart, removeCartItem, setCartItemQty } from '../cart.service';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
const mocked = api as unknown as Record<'get' | 'post' | 'patch' | 'delete', jest.Mock>;
const headers = { headers: { 'x-branch-id': 'br1' } };

beforeEach(() => Object.values(mocked).forEach((fn) => fn.mockReset()));

it('picks the active cart of the branch and reads it in full', async () => {
  mocked.get
    .mockResolvedValueOnce({
      data: { data: [{ id: 'old', branchId: 'br1', isActive: false }, { id: 'c2', branchId: 'br2' }, { cartId: 'c1', branchId: 'br1' }] },
    })
    .mockResolvedValueOnce({ data: { data: { id: 'c1', branchId: 'br1', items: [{ id: 'i1' }], finalPrice: 4 } } });
  await expect(getActiveCart('br1')).resolves.toEqual({ id: 'c1', branchId: 'br1', items: [{ id: 'i1' }], finalPrice: 4 });
  expect(mocked.get).toHaveBeenNthCalledWith(1, '/carts', headers);
  expect(mocked.get).toHaveBeenNthCalledWith(2, '/carts/c1', headers);
});

it('returns null when there is no open cart', async () => {
  mocked.get.mockResolvedValue({ data: { data: null } });
  await expect(getActiveCart('br1')).resolves.toBeNull();
});

it('sends cart writes with the branch header', async () => {
  mocked.post.mockResolvedValue({ data: { data: { cartId: 'c1' } } });
  mocked.patch.mockResolvedValue({ data: { data: { id: 'c1' } } });
  await addCartItem({ productId: 'p1', qty: 1, cartId: 'c1' }, 'br1');
  await setCartItemQty('i1', 3, 'br1');
  await removeCartItem('i1', 'br1');
  expect(mocked.post).toHaveBeenCalledWith('/carts/items', { productId: 'p1', qty: 1, cartId: 'c1' }, headers);
  expect(mocked.patch).toHaveBeenCalledWith('/carts/items/qty', { itemId: 'i1', qty: 3 }, headers);
  expect(mocked.delete).toHaveBeenCalledWith('/carts/items/i1', headers);
});

it('reads either cart id field', () => {
  expect(cartIdOf({ cartId: 'a', brandId: '', branchId: '' })).toBe('a');
  expect(cartIdOf({ id: 'b', brandId: '', branchId: '' })).toBe('b');
  expect(cartIdOf(null)).toBeNull();
});
