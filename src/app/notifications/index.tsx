import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { Bell, BellOff, ChevronLeft } from 'lucide-react-native';
import { useNotifications } from '@/context/NotificationsContext';
import { canUsePush, getPushPermission, type PushPermission } from '@/lib/push';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notification.service';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, font, radius, space } from '@/theme';

const isNotFound = (error: unknown) =>
  isAxiosError(error) && (error.response?.data as { code?: unknown } | undefined)?.code === 'NOTIFICATION_NOT_FOUND';

/** "My notifications": newest first, a page at a time; a tap marks one read. */
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { unreadCount, refreshUnread } = useNotifications();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const loadingMore = useRef(false);

  const loadFirst = useCallback(async () => {
    try {
      const first = await getMyNotifications(1);
      setItems(first.items);
      setPage(1);
      setTotalPages(first.totalPages);
      setFailed(false);
    } catch {
      setFailed(true);
      setItems((current) => current ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirst();
      refreshUnread();
      if (canUsePush()) getPushPermission().then(setPermission).catch(() => undefined);
    }, [loadFirst, refreshUnread]),
  );

  // A push that arrives while this screen is open is a new entry on top.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => loadFirst());
    return () => subscription.remove();
  }, [loadFirst]);

  const loadMore = async () => {
    if (loadingMore.current || page >= totalPages) return;
    loadingMore.current = true;
    try {
      const next = await getMyNotifications(page + 1);
      setItems((current) => {
        const seen = new Set((current ?? []).map((item) => item.id));
        return [...(current ?? []), ...next.items.filter((item) => !seen.has(item.id))];
      });
      setPage(next.page);
      setTotalPages(next.totalPages);
    } catch {
      // The next scroll tries again.
    } finally {
      loadingMore.current = false;
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFirst(), refreshUnread()]);
    setRefreshing(false);
  };

  const notFound = async () => {
    setMessage(t('common.apiErrors.NOTIFICATION_NOT_FOUND'));
    await loadFirst();
  };

  const open = async (item: AppNotification) => {
    if (item.readAt) return;
    setMessage(null);
    const readAt = new Date().toISOString();
    setItems((current) => current?.map((entry) => (entry.id === item.id ? { ...entry, readAt } : entry)) ?? null);
    try {
      await markNotificationRead(item.id);
    } catch (error) {
      if (isNotFound(error)) await notFound();
      else setItems((current) => current?.map((entry) => (entry.id === item.id ? item : entry)) ?? null);
    }
    refreshUnread();
  };

  const readAll = async () => {
    setMessage(null);
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems((current) => current?.map((entry) => ({ ...entry, readAt: entry.readAt ?? readAt })) ?? null);
    } catch (error) {
      if (isNotFound(error)) await notFound();
    }
    refreshUnread();
  };

  const hasUnread = (items ?? []).some((item) => !item.readAt) || unreadCount > 0;

  const banner =
    permission === 'denied' ? (
      <View style={styles.banner}>
        <BellOff size={18} color={colors.zinc600} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.bannerText}>{t('notifications.off')}</Text>
          <Pressable onPress={() => Linking.openSettings()} hitSlop={6}>
            <Text style={styles.link}>{t('notifications.openSettings')}</Text>
          </Pressable>
        </View>
      </View>
    ) : permission === 'undetermined' ? (
      <View style={styles.banner}>
        <Bell size={18} color={colors.primary} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.bannerText}>{t('notifications.permission.body')}</Text>
          <Pressable onPress={() => router.push('/notifications-permission')} hitSlop={6}>
            <Text style={styles.link}>{t('notifications.permission.allow')}</Text>
          </Pressable>
        </View>
      </View>
    ) : null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('common.back')}>
          <ChevronLeft size={26} color={colors.zinc800} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        {hasUnread ? (
          <Pressable onPress={readAll} hitSlop={10} accessibilityRole="button">
            <Text style={styles.link}>{t('notifications.readAll')}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>
      {items === null ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              {banner}
              {message ? <Text style={styles.error}>{message}</Text> : null}
              {failed && items.length ? <Text style={styles.error}>{t('notifications.loadError')}</Text> : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={32} color={colors.zinc300} />}
              title={failed ? t('notifications.loadError') : t('notifications.empty')}
              action={failed ? <Button label={t('retry')} variant="outline" onPress={refresh} /> : undefined}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`notification-${item.id}`}
              style={({ pressed }) => [styles.row, !item.readAt && styles.unread, pressed && { opacity: 0.9 }]}
              onPress={() => open(item)}
              accessibilityState={{ selected: !item.readAt }}
            >
              {!item.readAt ? <View style={styles.dot} accessibilityLabel={t('notifications.unread')} /> : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString(i18n.language === 'tr' ? 'tr-TR' : 'en-GB')}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.zinc200,
  },
  headerTitle: { fontSize: font.title, fontWeight: '800', color: colors.zinc900 },
  list: { padding: space.lg, gap: 10 },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: { fontSize: font.body, color: colors.zinc700, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 7 },
  title: { fontSize: font.base, fontWeight: '700', color: colors.zinc900 },
  body: { fontSize: font.body, lineHeight: 20, color: colors.zinc600 },
  date: { fontSize: font.small, color: colors.zinc400 },
  error: { color: colors.destructive, fontSize: font.body, textAlign: 'center' },
});
