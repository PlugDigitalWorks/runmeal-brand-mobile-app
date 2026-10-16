import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, MapPin, Plus, QrCode } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { useCart } from '@/context/CartContext';
import { useStorefront } from '@/context/StorefrontContext';
import { useTable } from '@/context/TableContext';
import { apiErrorMessage } from '@/lib/api-error';
import { isDelivery, isScheduled, orderTypesFor, paymentMethodsFor } from '@/lib/checkout';
import { formatMoney } from '@/lib/money';
import { setPendingPayment } from '@/lib/pending-payment';
import {
  createTablePayLaterOrder,
  getAddresses,
  getBranchAvailability,
  getFulfillmentSlots,
  initializePayment,
  setActiveAddress,
} from '@/services/order.service';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';
import type { Address, FulfillmentSlotsResponse, OrderType, PaymentMethod } from '@/types/order';

type TableTiming = 'payNow' | 'payLater';

/** brandfe's CheckoutPage and TableCheckoutPage in one mobile screen. */
export default function CheckoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();
  const { user } = useAuth();
  const { branch, menu } = useStorefront();
  const { journey } = useTable();
  const { lines, summary, cartId, loading: cartLoading, reload } = useCart();
  const currency = menu?.currency ?? branch?.currency ?? 'GBP';
  const cafeHost = brand?.primaryDomain ?? brand?.defaultDomain ?? '';

  const orderTypes = useMemo(() => (branch ? orderTypesFor(branch, journey?.checkoutOptions ?? null) : []), [branch, journey]);
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const currentType = orderType && orderTypes.includes(orderType) ? orderType : (orderTypes[0] ?? null);

  const tableTimings = useMemo<TableTiming[]>(
    () => (journey ? ([journey.checkoutOptions.payNow && 'payNow', journey.checkoutOptions.payLater && 'payLater'].filter(Boolean) as TableTiming[]) : []),
    [journey],
  );
  const [timing, setTiming] = useState<TableTiming | null>(null);
  const currentTiming = timing && tableTimings.includes(timing) ? timing : (tableTimings[0] ?? null);

  const methods = useMemo(
    () => (branch && currentType ? paymentMethodsFor(branch, currentType, !!journey) : []),
    [branch, currentType, journey],
  );
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const currentMethod = method && methods.includes(method) ? method : (methods[0] ?? null);

  const slotsKey = branch && currentType && isScheduled(currentType) ? `${branch.id}:${currentType}` : null;
  const [slotsResult, setSlotsResult] = useState<{ key: string; data: FulfillmentSlotsResponse | null } | null>(null);
  const slots = slotsResult && slotsResult.key === slotsKey ? slotsResult.data : null;
  const slotsLoading = slotsKey !== null && slotsResult?.key !== slotsKey;
  // A time picked for one scheduled type never carries over to the other.
  const [picked, setPicked] = useState<{ key: string; value: string } | null>(null);
  const slot = picked && picked.key === slotsKey ? picked.value : null;
  const setSlot = (value: string) => slotsKey && setPicked({ key: slotsKey, value });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branch || !currentType || !isScheduled(currentType) || !slotsKey) return;
    let cancelled = false;
    getFulfillmentSlots(branch.id, currentType)
      .then((data) => !cancelled && setSlotsResult({ key: slotsKey, data }))
      .catch(() => !cancelled && setSlotsResult({ key: slotsKey, data: null }));
    return () => {
      cancelled = true;
    };
  }, [branch, currentType, slotsKey]);

  // Addresses come back from the add-address modal, so reload on focus.
  useFocusEffect(
    useCallback(() => {
      if (!user || user.isGuest) return;
      getAddresses()
        .then((list) => {
          setAddresses(list);
          setAddressId((current) => current ?? list.find((a) => a.isActive)?.id ?? list[0]?.id ?? null);
        })
        .catch(() => setAddresses([]));
    }, [user]),
  );

  const placeOrder = async () => {
    // A fast double tap lands before `busy` re-renders the button; the ref stops the second order.
    if (submitting.current) return;
    // Lines from before sign-in (or from a table scan) are still being moved into the API cart.
    if (!cartId && cartLoading) return;
    if (!branch || !brand || !currentType || !cartId) return setError(t('checkout.empty'));
    const tablePayLater = currentType === 'TABLE_ORDER' && currentTiming === 'payLater';
    if (!tablePayLater && !currentMethod) return setError(t('checkout.noMethods'));
    if (isScheduled(currentType) && !slot) return setError(t('checkout.chooseSlot'));
    if (isDelivery(currentType) && !addressId) return setError(t('checkout.chooseAddress'));

    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const availability = await getBranchAvailability(branch.id);
      if (!availability.canAcceptOrders) {
        setError(t('checkout.closed'));
        return;
      }
      if (tablePayLater && journey) {
        const order = await createTablePayLaterOrder({ cartId, tableId: journey.tableId, branchId: branch.id, note });
        await reload();
        router.replace({ pathname: '/orders/[id]', params: { id: order.id, branchId: branch.id, placed: '1' } });
        return;
      }
      if (isDelivery(currentType) && addressId) await setActiveAddress(addressId);
      const payment = await initializePayment(
        {
          cartId,
          branchId: branch.id,
          paymentMethod: currentMethod!,
          orderType: currentType,
          ...(currentType === 'TABLE_ORDER' && journey ? { tableId: journey.tableId } : {}),
          ...(isScheduled(currentType) && slot ? { scheduledFor: slot } : {}),
          note,
        },
        cafeHost,
      );
      if (payment.paymentUrl || payment.checkoutFormContent) {
        setPendingPayment({
          paymentId: payment.paymentId,
          branchId: branch.id,
          cartId,
          paymentUrl: payment.paymentUrl,
          checkoutFormContent: payment.checkoutFormContent,
        });
        router.push('/payment');
        return;
      }
      // Cash and card on delivery: the order exists already (brandfe goes straight to the success page).
      await reload();
      if (payment.orderId) {
        router.replace({ pathname: '/orders/[id]', params: { id: payment.orderId, branchId: branch.id, placed: '1' } });
      } else {
        router.replace('/orders');
      }
    } catch (e) {
      setError(apiErrorMessage(e, t('checkout.failed')));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (!branch) return <ActivityIndicator style={{ marginTop: 64 }} color={colors.primary} />;

  const tablePayLater = currentType === 'TABLE_ORDER' && currentTiming === 'payLater';
  const ctaLabel = !tablePayLater && currentMethod === 'ONLINE_CARD' ? t('checkout.proceedToPayment') : t('checkout.placeOrder');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft size={26} color={colors.zinc800} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('checkout.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {journey ? (
          <View style={styles.tablePill}>
            <QrCode size={13} color={colors.primary} />
            <Text style={styles.tablePillText}>{t('cart.tableBanner', { table: journey.tableLabel })}</Text>
          </View>
        ) : null}
        <Text style={styles.branch}>{branch.name}</Text>

        <Section title={t('checkout.orderType')}>
          {orderTypes.map((type) => (
            <Choice key={type} label={t(`checkout.${type}`)} selected={type === currentType} onPress={() => setOrderType(type)} />
          ))}
        </Section>

        {currentType === 'TABLE_ORDER' && tableTimings.length ? (
          <Section title={t('checkout.tableTiming')}>
            {tableTimings.map((option) => (
              <Choice key={option} label={t(`checkout.${option}`)} selected={option === currentTiming} onPress={() => setTiming(option)} />
            ))}
          </Section>
        ) : null}

        {currentType && isScheduled(currentType) ? (
          <Section title={t('checkout.when')}>
            {slotsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : slots?.available && slots.dates.some((d) => d.slots.length) ? (
              slots.dates
                .filter((d) => d.slots.length)
                .map((day) => (
                  <View key={day.date} style={{ gap: 8 }}>
                    <Text style={styles.day}>{day.date}</Text>
                    <View style={styles.slotGrid}>
                      {day.slots.map((s) => (
                        <Pressable
                          key={s.value}
                          onPress={() => setSlot(s.value)}
                          style={[styles.slot, slot === s.value && styles.slotOn]}
                        >
                          <Text style={[styles.slotText, slot === s.value && { color: colors.primaryForeground }]}>{s.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))
            ) : (
              <Text style={styles.muted}>{t('checkout.noSlots')}</Text>
            )}
          </Section>
        ) : null}

        {currentType && isDelivery(currentType) ? (
          <Section title={t('checkout.address')}>
            {addresses.length === 0 ? <Text style={styles.muted}>{t('checkout.noAddress')}</Text> : null}
            {addresses.map((address) => (
              <Choice
                key={address.id}
                icon={<MapPin size={16} color={address.id === addressId ? colors.primary : colors.zinc400} />}
                label={`${address.street} ${address.buildingNumber}${address.apartmentNumber ? `/${address.apartmentNumber}` : ''}`}
                detail={`${address.district}, ${address.province} ${address.postalCode}`}
                selected={address.id === addressId}
                onPress={() => setAddressId(address.id)}
              />
            ))}
            <Pressable style={styles.addRow} onPress={() => router.push('/address-new')}>
              <Plus size={16} color={colors.primary} />
              <Text style={styles.addText}>{t('checkout.addAddress')}</Text>
            </Pressable>
          </Section>
        ) : null}

        {!tablePayLater ? (
          <Section title={t('checkout.payment')}>
            {methods.length === 0 ? <Text style={styles.muted}>{t('checkout.noMethods')}</Text> : null}
            {methods.map((m) => (
              <Choice key={m} label={t(`checkout.${m}`)} selected={m === currentMethod} onPress={() => setMethod(m)} />
            ))}
          </Section>
        ) : null}

        <Section title={t('checkout.note')}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('checkout.notePlaceholder')}
            placeholderTextColor={colors.zinc400}
            multiline
            maxLength={500}
            style={styles.note}
          />
        </Section>

        <Section title={t('checkout.summary')}>
          {lines.map((line) => (
            <View key={line.id} style={styles.summaryRow}>
              <Text style={styles.summaryItem} numberOfLines={1}>
                {line.qty}× {line.name}
              </Text>
              <Text style={styles.summaryPrice}>{formatMoney(line.lineTotal, currency)}</Text>
            </View>
          ))}
          {summary.discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryItem}>{t('cart.discount')}</Text>
              <Text style={[styles.summaryPrice, { color: colors.success }]}>-{formatMoney(summary.discount, currency)}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text style={styles.totalValue}>{formatMoney(summary.total, currency)}</Text>
          </View>
        </Section>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={ctaLabel} trailing={formatMoney(summary.total, currency)} loading={busy || (!cartId && cartLoading)} onPress={placeOrder} />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Choice({
  label,
  detail,
  icon,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected ? styles.choiceOn : styles.choiceOff]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.choiceLabel, selected && { color: colors.orange700 }]}>{label}</Text>
        {detail ? <Text style={styles.choiceDetail}>{detail}</Text> : null}
      </View>
    </Pressable>
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
  content: { padding: space.lg, gap: space.lg, paddingBottom: 32 },
  tablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.orange50,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tablePillText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  branch: { fontSize: font.heading, fontWeight: '800', color: colors.zinc900 },
  section: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  sectionTitle: { fontSize: font.base, fontWeight: '800', color: colors.zinc800 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.orange50 },
  choiceOff: { borderColor: colors.zinc200, backgroundColor: colors.card },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.zinc300, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryForeground },
  choiceLabel: { fontSize: font.base - 1, fontWeight: '600', color: colors.zinc700 },
  choiceDetail: { fontSize: font.small, color: colors.zinc500, marginTop: 2 },
  muted: { fontSize: font.body, color: colors.zinc500 },
  day: { fontSize: font.small, fontWeight: '700', color: colors.zinc500, textTransform: 'uppercase', letterSpacing: 0.6 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.zinc200, backgroundColor: colors.card },
  slotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: font.body, fontWeight: '600', color: colors.zinc700 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  addText: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  note: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.zinc200,
    borderRadius: radius.md,
    padding: 12,
    fontSize: font.body,
    color: colors.zinc800,
    textAlignVertical: 'top',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryItem: { flex: 1, fontSize: font.body, color: colors.zinc600 },
  summaryPrice: { fontSize: font.body, fontWeight: '600', color: colors.zinc700 },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.zinc200, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: font.title, fontWeight: '800', color: colors.zinc900 },
  totalValue: { fontSize: font.title, fontWeight: '800', color: colors.zinc900 },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: 12,
    gap: 8,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.zinc100,
  },
  error: { color: colors.destructive, fontSize: font.body, textAlign: 'center' },
});
