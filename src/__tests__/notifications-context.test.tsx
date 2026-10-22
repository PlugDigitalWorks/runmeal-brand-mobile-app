import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { act, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { NotificationsProvider, useNotifications } from '@/context/NotificationsContext';
import { canUsePush, getPushPermission, onPushTokenChange, registerForPush, wasPermissionAsked } from '@/lib/push';
import { getUnreadNotificationCount } from '@/services/notification.service';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useRootNavigationState: () => ({ key: 'root' }) }));
const mockAuth = { user: null as null | { id: string; isGuest?: boolean }, status: 'signedOut' as string };
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/lib/push', () => ({
  setUpNotifications: jest.fn(),
  canUsePush: jest.fn(() => true),
  getPushPermission: jest.fn(async () => 'granted'),
  registerForPush: jest.fn(async () => 'registered'),
  wasPermissionAsked: jest.fn(async () => false),
  onPushTokenChange: jest.fn(() => () => undefined),
}));
jest.mock('@/services/notification.service', () => ({ getUnreadNotificationCount: jest.fn(async () => 3) }));

type Ctx = ReturnType<typeof useNotifications>;
let ctx: Ctx;
const capture = (value: Ctx) => {
  ctx = value;
};
function Probe({ onRender }: { onRender: (value: Ctx) => void }) {
  onRender(useNotifications());
  return null;
}
const mount = () => render(<NotificationsProvider><Probe onRender={capture} /></NotificationsProvider>);
const signIn = (extra: { isGuest?: boolean } = {}) => {
  mockAuth.user = { id: 'u1', ...extra };
  mockAuth.status = 'signedIn';
};
const tap = (path: unknown, id = `n-${Math.random()}`) =>
  ({ notification: { request: { identifier: id, content: { data: { id: 'x', path } } } } }) as unknown as Notifications.NotificationResponse;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.user = null;
  mockAuth.status = 'signedOut';
  (canUsePush as jest.Mock).mockReturnValue(true);
  (getPushPermission as jest.Mock).mockResolvedValue('granted');
});

it('never registers or asks for a guest, a signed-out user or on a simulator', async () => {
  await mount();
  signIn({ isGuest: true });
  await mount();
  mockAuth.user = { id: 'u1' };
  (canUsePush as jest.Mock).mockReturnValue(false);
  await mount();
  await new Promise((r) => setTimeout(r, 0));
  expect(registerForPush).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalledWith('/notifications-permission');
});

it('registers on launch when allowed and again when the token rotates', async () => {
  signIn();
  await mount();
  await waitFor(() => expect(registerForPush).toHaveBeenCalledTimes(1));
  const [[onRotate]] = (onPushTokenChange as jest.Mock).mock.calls;
  onRotate();
  expect(registerForPush).toHaveBeenCalledTimes(2);
});

it("shows the app's own prompt once when permission was never asked", async () => {
  signIn();
  (getPushPermission as jest.Mock).mockResolvedValue('undetermined');
  await mount();
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/notifications-permission'));
  expect(registerForPush).not.toHaveBeenCalled();

  jest.clearAllMocks();
  (wasPermissionAsked as jest.Mock).mockResolvedValue(true);
  await mount();
  await new Promise((r) => setTimeout(r, 0));
  expect(router.push).not.toHaveBeenCalled();
  (wasPermissionAsked as jest.Mock).mockResolvedValue(false);
});

it('keeps the unread count current on launch, in the foreground and when a push arrives', async () => {
  signIn();
  let toForeground: (state: string) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
    toForeground = handler as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
  await mount();
  await waitFor(() => expect(ctx.unreadCount).toBe(3));

  (getUnreadNotificationCount as jest.Mock).mockResolvedValueOnce(5);
  await act(async () => toForeground('active'));
  await waitFor(() => expect(ctx.unreadCount).toBe(5));

  (getUnreadNotificationCount as jest.Mock).mockResolvedValueOnce(6);
  const received = (Notifications.addNotificationReceivedListener as jest.Mock).mock.calls.at(-1)[0];
  await act(async () => received({}));
  await waitFor(() => expect(ctx.unreadCount).toBe(6));
});

it('opens what a tapped notification points at while the app runs', async () => {
  signIn();
  await mount();
  const onTap = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls.at(-1)[0];
  await act(async () => onTap(tap('/orders/abc-123')));
  await act(async () => onTap(tap('/notifications')));
  await act(async () => onTap(tap('/somewhere-else')));
  expect((router.push as jest.Mock).mock.calls).toEqual([['/orders/abc-123'], ['/notifications'], ['/home']]);
});

it('sends a signed-out tap through sign-in and on to the target', async () => {
  await mount();
  const onTap = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls.at(-1)[0];
  await act(async () => onTap(tap('/orders/abc-123')));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/login', params: { next: '/orders/abc-123' } });
});

it('opens the tap that launched a closed app, once', async () => {
  signIn();
  (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValueOnce(tap('/orders/cold-1', 'cold'));
  await mount();
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/orders/cold-1'));
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
  // The same notification arriving through the listener as well is not opened twice.
  const onTap = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls.at(-1)[0];
  await act(async () => onTap(tap('/orders/cold-1', 'cold')));
  expect((router.push as jest.Mock).mock.calls.filter(([href]) => href === '/orders/cold-1')).toHaveLength(1);
});
