import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { QrCode, ShoppingCart } from 'lucide-react-native';
import { CartLineRow } from '@/components/CartLineRow';
import { useCart } from '@/context/CartContext';
import { useStorefront } from '@/context/StorefrontContext';
import { useTable } from '@/context/TableContext';
import { apiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/money';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, font, radius, space } from '@/theme';

export default function CartScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { lines, summary, setQty } = useCart();
  const { menu, branch } = useStorefront();
  const { journey } = useTable();
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currency = menu?.currency ?? branch?.currency ?? 'GBP';

  const changeQty = async (lineId: string, qty: number) => {
    setBusyLine(lineId);
    setError(null);
    try {
      await setQty(lineId, qty);
    } catch (e) {
      setError(apiErrorMessage(e, t('cart.updateFailed')));
    } finally {
      setBusyLine(null);
    }
  };


  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{t('cart.title')}</Text>
      {journey ? (
        <View style={styles.tablePill}>
          <QrCode size={13} color={colors.primary} />
          <Text style={styles.tablePillText}>{t('cart.tableBanner', { table: journey.tableLabel })}</Text>
        </View>
      ) : null}

      {lines.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={<ShoppingCart size={40} color={colors.primary} />}
            tone="brand"
            title={t('cart.emptyTitle')}
            body={t('cart.emptyBody')}
            action={<Button label={t('cart.goToMenu')} onPress={() => router.navigate('/menu')} style={{ marginTop: 8, alignSelf: 'stretch' }} />}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.card}>
              {lines.map((line, index) => (
                <View key={line.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <CartLineRow line={line} currency={currency} busy={busyLine === line.id} onQty={(qty) => changeQty(line.id, qty)} />
                </View>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={[styles.card, styles.summary]}>
              <Row label={t('cart.subtotal')} value={formatMoney(summary.subtotal, currency)} />
              {summary.discount > 0 ? <Row label={t('cart.discount')} value={`-${formatMoney(summary.discount, currency)}`} accent /> : null}
              <View style={styles.divider} />
              <Row label={t('cart.total')} value={formatMoney(summary.total, currency)} strong />
            </View>
          </ScrollView>
          <View style={{ paddingBottom: space.md }}>
            <Button
              label={t('cart.checkout')}
              trailing={formatMoney(summary.total, currency)}
              onPress={() => router.push('/checkout')}
            />
          </View>
        </>
      )}
    </View>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.strong, accent && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.lg, gap: space.md },
  title: { fontSize: font.display, fontWeight: '800', color: colors.zinc900, letterSpacing: -0.5 },
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.zinc100 },
  error: { color: colors.destructive, marginTop: 8, fontSize: font.body },
  summary: { marginTop: 12, paddingVertical: 10, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: font.body, color: colors.zinc600 },
  summaryValue: { fontSize: font.body, color: colors.zinc700, fontWeight: '600' },
  strong: { fontSize: font.title, fontWeight: '800', color: colors.zinc900 },
});
