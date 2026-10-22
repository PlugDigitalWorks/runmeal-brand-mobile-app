import { BRAND } from '@brand';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

/** One entry in "My notifications". Title and body are plain text. */
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  page: number;
  totalPages: number;
}

export const NOTIFICATION_PAGE_SIZE = 20;

/** Ties this phone's Expo push token to the signed-in user for this brand. Answers 204. */
export async function registerExpoPushToken(token: string, brandId: string): Promise<void> {
  await api.post('/push/expo-tokens', { token, brandId });
}

/** Unties the token before sign-out, so the next person on this phone gets nothing. Answers 204. */
export async function removeExpoPushToken(token: string): Promise<void> {
  await api.delete('/push/expo-tokens', { data: { token } });
}

/** Newest first, in the brand's language. */
export async function getMyNotifications(page: number, limit = NOTIFICATION_PAGE_SIZE): Promise<NotificationPage> {
  const { data } = await api.get<ApiResponse<{ data: AppNotification[]; meta?: { page?: number; totalPages?: number } }>>(
    '/notifications/me',
    { params: { lang: BRAND.lang, page, limit } },
  );
  const items = data.data?.data ?? [];
  return { items, page: data.data?.meta?.page ?? page, totalPages: data.data?.meta?.totalPages ?? page };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/me/unread-count');
  return data.data?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/me/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/me/read-all');
}
