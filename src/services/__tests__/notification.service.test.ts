import { api } from '@/lib/api';
import { getMyNotifications, getUnreadNotificationCount, registerExpoPushToken, removeExpoPushToken } from '../notification.service';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('@brand', () => ({ BRAND: { lang: 'tr' } }));

beforeEach(() => jest.clearAllMocks());

it('sends the token with the brand, and removes it with a body', async () => {
  await registerExpoPushToken('ExponentPushToken[a]', 'b1');
  expect(api.post).toHaveBeenCalledWith('/push/expo-tokens', { token: 'ExponentPushToken[a]', brandId: 'b1' });
  await removeExpoPushToken('ExponentPushToken[a]');
  expect(api.delete).toHaveBeenCalledWith('/push/expo-tokens', { data: { token: 'ExponentPushToken[a]' } });
});

it("reads a page in the brand's language, and the unread count", async () => {
  (api.get as jest.Mock).mockResolvedValueOnce({
    data: { status: true, data: { data: [{ id: 'n1' }], meta: { total: 21, page: 1, limit: 20, totalPages: 2 } } },
  });
  await expect(getMyNotifications(1)).resolves.toEqual({ items: [{ id: 'n1' }], page: 1, totalPages: 2 });
  expect(api.get).toHaveBeenCalledWith('/notifications/me', { params: { lang: 'tr', page: 1, limit: 20 } });

  (api.get as jest.Mock).mockResolvedValueOnce({ data: { status: true, data: { count: 4 } } });
  await expect(getUnreadNotificationCount()).resolves.toBe(4);
});
