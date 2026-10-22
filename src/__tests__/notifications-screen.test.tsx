import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import NotificationsScreen from '@/app/notifications';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notification.service';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(fn, [fn]);
  },
}));
const mockRefreshUnread = jest.fn(async () => undefined);
const mockNotifications = { unreadCount: 1, refreshUnread: mockRefreshUnread };
jest.mock('@/context/NotificationsContext', () => ({ useNotifications: () => mockNotifications }));
jest.mock('@/lib/push', () => ({ canUsePush: () => false, getPushPermission: jest.fn() }));
jest.mock('@/services/notification.service', () => ({
  getMyNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

const entry = (id: string, readAt: string | null = null): AppNotification => ({
  id,
  title: `Title ${id}`,
  body: `<b>Body ${id}</b>`,
  readAt,
  createdAt: '2026-10-22T09:00:00Z',
});
const notFound = () => {
  const cfg = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('fail', '404', cfg, undefined, {
    status: 404,
    data: { code: 'NOTIFICATION_NOT_FOUND' },
    headers: {},
    config: cfg,
    statusText: '',
  } as AxiosResponse);
};

beforeEach(() => {
  jest.clearAllMocks();
  (getMyNotifications as jest.Mock).mockImplementation(async (page: number) =>
    page === 1 ? { items: [entry('n1'), entry('n2', '2026-10-21T09:00:00Z')], page: 1, totalPages: 2 } : { items: [entry('n3')], page: 2, totalPages: 2 },
  );
  (markNotificationRead as jest.Mock).mockResolvedValue(undefined);
  (markAllNotificationsRead as jest.Mock).mockResolvedValue(undefined);
});

it('lists notifications as plain text and loads the next page at the end', async () => {
  await render(<NotificationsScreen />);
  expect(await screen.findByText('Title n1')).toBeTruthy();
  expect(screen.getByText('<b>Body n1</b>')).toBeTruthy();
  expect(screen.getAllByLabelText('Unread')).toHaveLength(1);

  await fireEvent(screen.getByTestId('notification-n2').parent!.parent!, 'onEndReached');
  await waitFor(() => expect(getMyNotifications).toHaveBeenCalledWith(2));
  expect(await screen.findByText('Title n3')).toBeTruthy();
});

it('marks one as read on tap and refreshes the badge', async () => {
  await render(<NotificationsScreen />);
  await fireEvent.press(await screen.findByTestId('notification-n1'));
  await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('n1'));
  expect(mockRefreshUnread).toHaveBeenCalled();
  expect(screen.queryAllByLabelText('Unread')).toHaveLength(0);

  // Already read: no request.
  await fireEvent.press(screen.getByTestId('notification-n2'));
  expect(markNotificationRead).toHaveBeenCalledTimes(1);
});

it('marks everything read', async () => {
  await render(<NotificationsScreen />);
  await fireEvent.press(await screen.findByText('Mark all as read'));
  await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
  expect(screen.queryAllByLabelText('Unread')).toHaveLength(0);
});

it('says a deleted notification is gone and reloads the list', async () => {
  (markNotificationRead as jest.Mock).mockRejectedValueOnce(notFound());
  await render(<NotificationsScreen />);
  await fireEvent.press(await screen.findByTestId('notification-n1'));
  expect(await screen.findByText('Notification not found.')).toBeTruthy();
  expect((getMyNotifications as jest.Mock).mock.calls.filter(([page]) => page === 1).length).toBeGreaterThan(1);
});
