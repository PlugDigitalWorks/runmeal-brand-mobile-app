import { api } from '@/lib/api';
import { createTablePayLaterOrder, getAddresses, getMyOrders, getOrder, initializePayment, setActiveAddress } from '../order.service';
import { getMemberQr, getStampCards } from '../loyalty.service';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
const mocked = api as unknown as Record<'get' | 'post' | 'patch', jest.Mock>;

beforeEach(() => Object.values(mocked).forEach((fn) => fn.mockReset()));

it('initializes payment like brandfe, with the cafe host as Origin for the return URL', async () => {
  mocked.post.mockResolvedValue({ data: { data: { paymentId: 'pay1', paymentUrl: 'https://pay' } } });
  const res = await initializePayment(
    { cartId: 'c1', branchId: 'br1', paymentMethod: 'ONLINE_CARD', orderType: 'SCHEDULED_PICKUP', scheduledFor: 'slot-1', note: ' no ice ' },
    'order.dharmacoffee.uk',
  );
  expect(res.paymentUrl).toBe('https://pay');
  expect(mocked.post).toHaveBeenCalledWith(
    '/payments/initialize',
    { cartId: 'c1', paymentMethod: 'ONLINE_CARD', orderType: 'SCHEDULED_PICKUP', scheduledFor: 'slot-1', creditUsedAmount: 0, note: 'no ice' },
    { headers: { 'x-branch-id': 'br1', Origin: 'https://order.dharmacoffee.uk', Referer: 'https://order.dharmacoffee.uk/' } },
  );
});

it('sends the table id only for table orders', async () => {
  mocked.post.mockResolvedValue({ data: { data: { paymentId: 'p' } } });
  await initializePayment({ cartId: 'c1', branchId: 'br1', paymentMethod: 'ONLINE_CARD', orderType: 'TABLE_ORDER', tableId: 't1' }, 'h');
  expect(mocked.post.mock.calls[0][1]).toMatchObject({ orderType: 'TABLE_ORDER', tableId: 't1' });
  await initializePayment({ cartId: 'c1', branchId: 'br1', paymentMethod: 'CASH', orderType: 'PICKUP', tableId: 't1' }, 'h');
  expect(mocked.post.mock.calls[1][1]).not.toHaveProperty('tableId');
});

it('opens a pay-later table order', async () => {
  mocked.post.mockResolvedValue({ data: { data: { id: 'o1', totalPrice: '5' } } });
  await createTablePayLaterOrder({ cartId: 'c1', tableId: 't1', branchId: 'br1' });
  expect(mocked.post).toHaveBeenCalledWith('/orders/table/pay-later', { cartId: 'c1', tableId: 't1' }, { headers: { 'x-branch-id': 'br1' } });
});

it('reads orders whether paginated or bare', async () => {
  mocked.get.mockResolvedValueOnce({ data: { data: { data: [{ id: 'o1' }] } } }).mockResolvedValueOnce({ data: { data: [{ id: 'o2' }] } });
  await expect(getMyOrders()).resolves.toEqual([{ id: 'o1' }]);
  await expect(getMyOrders()).resolves.toEqual([{ id: 'o2' }]);
  expect(mocked.get).toHaveBeenCalledWith('/orders/customer', { params: { limit: 100 } });
});

it('fetches an order with its branch and brand headers', async () => {
  mocked.get.mockResolvedValue({ data: { data: { id: 'o1', items: [] } } });
  await getOrder('o1', 'br1', 'b1');
  expect(mocked.get).toHaveBeenCalledWith('/orders/o1', { headers: { 'x-branch-id': 'br1', 'x-brand-id': 'b1' } });
});

it('reads addresses and activates one for delivery', async () => {
  mocked.get.mockResolvedValue({ data: { status: true, message: 'ok', data: [{ id: 'a1' }] } });
  await expect(getAddresses()).resolves.toEqual([{ id: 'a1' }]);
  await setActiveAddress('a1');
  expect(mocked.patch).toHaveBeenCalledWith('/addresses/a1/set-active');
});

it('loads the member QR and stamp cards', async () => {
  mocked.get.mockResolvedValueOnce({ data: { data: { qrToken: 't', qrValue: 'v' } } }).mockResolvedValueOnce({ data: { data: [] } });
  await expect(getMemberQr()).resolves.toEqual({ qrToken: 't', qrValue: 'v' });
  await expect(getStampCards('b1')).resolves.toEqual([]);
  expect(mocked.get).toHaveBeenLastCalledWith('/loyalty/stamps/me/b1');
});
