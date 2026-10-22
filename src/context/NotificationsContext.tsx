import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState, type Href } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { notificationTarget } from '@/lib/notification-routing';
import {
  canUsePush,
  getPushPermission,
  onPushTokenChange,
  registerForPush,
  setUpNotifications,
  wasPermissionAsked,
} from '@/lib/push';
import { getUnreadNotificationCount } from '@/services/notification.service';

type NotificationsValue = {
  /** Unread entries in "My notifications"; 0 while signed out. */
  unreadCount: number;
  refreshUnread: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsValue | undefined>(undefined);

/**
 * Push for signed-in, non-guest customers: asks with the app's own screen once,
 * registers the token on sign-in, launch and token rotation, keeps the unread
 * badge current, and opens what a tapped notification points at.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const eligible = !!user && !user.isGuest;
  const navReady = !!useRootNavigationState()?.key;
  const [unreadCount, setUnreadCount] = useState(0);
  const handled = useRef(new Set<string>());
  const coldStartChecked = useRef(false);

  useEffect(() => {
    setUpNotifications();
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!eligible) return;
    try {
      setUnreadCount(await getUnreadNotificationCount());
    } catch {
      // Keep the last count; the next foreground or notification tries again.
    }
  }, [eligible]);

  // Every sign-in and every launch: register if allowed, otherwise offer the app's own prompt once.
  useEffect(() => {
    if (!eligible || !navReady || !canUsePush()) return;
    let cancelled = false;
    (async () => {
      const permission = await getPushPermission();
      if (cancelled) return;
      if (permission === 'granted') await registerForPush();
      else if (permission === 'undetermined' && !(await wasPermissionAsked()) && !cancelled) {
        router.push('/notifications-permission');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, user?.id, navReady]);

  useEffect(() => {
    if (!eligible) return;
    return onPushTokenChange(() => {
      registerForPush();
    });
  }, [eligible]);

  useEffect(() => {
    let cancelled = false;
    if (eligible) {
      getUnreadNotificationCount()
        .then((count) => !cancelled && setUnreadCount(count))
        .catch(() => undefined);
    }
    const foreground = AppState.addEventListener('change', (state) => state === 'active' && refreshUnread());
    const received = Notifications.addNotificationReceivedListener(() => refreshUnread());
    return () => {
      cancelled = true;
      foreground.remove();
      received.remove();
    };
  }, [eligible, refreshUnread]);

  const open = useCallback(
    (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current.has(id)) return;
      handled.current.add(id);
      const target = notificationTarget(response.notification.request.content.data?.path);
      if (target.needsSignIn && status !== 'signedIn') {
        // The sign-in sheet carries on to the target once the customer is in.
        router.push({ pathname: '/login', params: { next: target.href } });
      } else {
        router.push(target.href as Href);
      }
      refreshUnread();
    },
    [status, refreshUnread],
  );

  // Tapped while the app was running (foreground or background).
  useEffect(() => {
    if (!navReady || status === 'loading') return;
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [navReady, status, open]);

  // Tapped while the app was closed: the tap that launched it.
  useEffect(() => {
    if (!navReady || status === 'loading' || coldStartChecked.current) return;
    coldStartChecked.current = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        open(response);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);
  }, [navReady, status, open]);

  // Signed out, a count left from the previous account never shows.
  const shownCount = eligible ? unreadCount : 0;
  const value = useMemo(() => ({ unreadCount: shownCount, refreshUnread }), [shownCount, refreshUnread]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationsProvider');
  return context;
}
