import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronLeft, ReceiptText } from 'lucide-react-native';
import { StatusPill } from '@/components/StatusPill';
import { useBrand } from '@/context/BrandContext';
import { useStorefront } from '@/context/StorefrontContext';
import { formatMoney } from '@/lib/money';
import { humanize, itemOptions, itemQuantity, itemTotal } from '@/lib/order-display';
import { getOrder } from '@/services/order.service';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, font, radius, space } from '@/theme';
import type { OrderDetails } from '@/types/order';

/** Order confirmation (`placed=1`) and order detail, like brandfe's /payment/callback and /orders/[id]. */
export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, branchId: paramBranch, placed } = useLocalSearchParams<{ id: string; branchId?: string; placed?: string }>();
  const { brand } = useBrand();
  const { branch } = useStorefront();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const branchId = paramBranch ?? branch?.id ?? '';

  const load = useCallback(async () => {
    if (!brand) return;
    try {
      setOrder(await getOrder(id, branchId, brand.brandId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id, branchId, brand]);

  useEffect(() => {
    if (!brand) return;
    let cancelled = false;
    getOrder(id, branchId, brand.brandId)
      .then((next) => {
        if (cancelled) return;
        setOrder(next);
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id, branchId, brand]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const currency = order?.currency ?? brand?.currency ?? 'GBP';
  const leave = () => (placed ? router.replace('/home') : router.back());

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={leave} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft size={26} color={colors.zinc800} />
        </Pressable>
        <Text style={styles.headerTitle}>{order ? t('orders.number', { number: order.orderNumber }) : ''}</Text>
        <View style={{ width: 26 }} />
      </View>

      {failed && !order ? (
        <EmptyState icon={<ReceiptText size={32} color={colors.zinc300} />} title={t('orders.error')} action={<Button label={t('retry')} variant="outline" onPress={refresh} />} />
      ) : !order ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {placed ? (
            <View style={styles.placed}>
              <CheckCircle2 size={40} color={colors.success} />
              <Text style={styles.placedTitle}>{t('orders.placed')}</Text>
              <Text style={styles.placedBody}>{t('orders.placedBody')}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.number}>{t('orders.number', { number: order.orderNumber })}</Text>
              <StatusPill status={order.status} />
            </View>
            <Text style={styles.date}>{new Date(order.createdAt).toLocaleString('en-GB')}</Text>
            {order.orderType ? <Info label={t('orders.type')} value={t(`checkout.${order.orderType}`, { defaultValue: humanize(order.orderType) })} /> : null}
            {order.paymentMethod ? (
              <Info label={t('orders.payment')} value={t(`checkout.${order.paymentMethod}`, { defaultValue: humanize(order.paymentMethod) })} />
            ) : null}
            {order.tableLabel ? <Info label={t('orders.type')} value={t('orders.table', { table: order.tableLabel })} /> : null}
            {order.scheduledFor ? (
              <Info label={t('checkout.when')} value={new Date(order.scheduledFor).toLocaleString('en-GB')} />
            ) : null}
            {order.addressText ? <Info label={t('checkout.address')} value={order.addressText} /> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('orders.items')}</Text>
            {order.items.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.qty}>{itemQuantity(item)}×</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  {itemOptions(item) ? <Text style={styles.meta}>{itemOptions(item)}</Text> : null}
                  {item.note ? <Text style={styles.meta}>{t('cart.note', { note: item.note })}</Text> : null}
                </View>
                <Text style={styles.itemPrice}>{formatMoney(itemTotal(item), currency)}</Text>
              </View>
            ))}
            {Number(order.discountAmount ?? 0) > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.meta}>{t('cart.discount')}</Text>
                <Text style={[styles.itemPrice, { color: colors.success }]}>-{formatMoney(order.discountAmount, currency)}</Text>
              </View>
            ) : null}
            <View style={[styles.totalRow, styles.totalLine]}>
              <Text style={styles.totalLabel}>{t('orders.total')}</Text>
              <Text style={styles.totalValue}>{formatMoney(order.totalPrice, currency)}</Text>
            </View>
          </View>

          {placed ? <Button label={t('orders.backToMenu')} variant="outline" onPress={() => router.replace('/menu')} /> : null}
        </ScrollView>
      )}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  content: { padding: space.lg, gap: space.lg },
  placed: { alignItems: 'center', gap: 6, paddingVertical: space.lg },
  placedTitle: { fontSize: font.heading + 2, fontWeight: '800', color: colors.zinc900 },
  placedBody: { fontSize: font.base, color: colors.zinc500 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  number: { fontSize: font.title + 2, fontWeight: '800', color: colors.zinc900 },
  date: { fontSize: font.small + 1, color: colors.zinc500, marginTop: -4 },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontSize: font.body, color: colors.zinc500 },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: font.body, fontWeight: '600', color: colors.zinc800 },
  sectionTitle: { fontSize: font.base, fontWeight: '800', color: colors.zinc800 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  qty: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: font.small,
    fontWeight: '700',
    color: colors.zinc700,
    borderWidth: 1,
    borderColor: colors.zinc200,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  itemName: { fontSize: font.body + 1, fontWeight: '600', color: colors.zinc800 },
  meta: { fontSize: font.small, color: colors.zinc500 },
  itemPrice: { fontSize: font.body, fontWeight: '600', color: colors.zinc800 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.zinc200, paddingTop: 10 },
  totalLabel: { fontSize: font.title, fontWeight: '800', color: colors.zinc900 },
  totalValue: { fontSize: font.title, fontWeight: '800', color: colors.primary },
});
