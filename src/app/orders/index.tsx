import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react-native';
import { StatusPill } from '@/components/StatusPill';
import { useBrand } from '@/context/BrandContext';
import { formatMoney } from '@/lib/money';
import { getMyOrders } from '@/services/order.service';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, font, radius, space } from '@/theme';
import type { Order } from '@/types/order';

/** brandfe's profile → orders tab: this cafe's orders, newest first. */
export default function OrdersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    let all: Order[];
    try {
      all = await getMyOrders();
    } catch {
      // Keep what is on screen; a failed refresh must not read as "no orders".
      setFailed(true);
      setOrders((current) => current ?? []);
      return;
    }
    setFailed(false);
    setOrders(
      all
        .filter((order) => !brand || order.brandId === brand.brandId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
  }, [brand]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft size={26} color={colors.zinc800} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('orders.title')}</Text>
        <View style={{ width: 26 }} />
      </View>
      {orders === null ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListHeaderComponent={failed && orders.length ? <Text style={styles.error}>{t('orders.loadError')}</Text> : undefined}
          ListEmptyComponent={
            <EmptyState
              icon={<ReceiptText size={32} color={colors.zinc300} />}
              title={failed ? t('orders.loadError') : t('orders.empty')}
              action={failed ? <Button label={t('retry')} variant="outline" onPress={refresh} /> : undefined}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
              onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id, branchId: item.branchId } })}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.number}>{t('orders.number', { number: item.orderNumber })}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('en-GB')}</Text>
                <StatusPill status={item.status} />
              </View>
              <Text style={styles.total}>{formatMoney(item.totalPrice, item.currency ?? brand?.currency ?? 'GBP')}</Text>
              <ChevronRight size={18} color={colors.zinc400} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  number: { fontSize: font.base, fontWeight: '800', color: colors.zinc900 },
  date: { fontSize: font.small, color: colors.zinc500 },
  total: { fontSize: font.base, fontWeight: '800', color: colors.zinc900 },
  error: { color: colors.destructive, fontSize: font.body, textAlign: 'center' },
});
