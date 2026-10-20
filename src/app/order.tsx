import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CreditCard, QrCode, Utensils, Wallet, X } from 'lucide-react-native';
import { useTable } from '@/context/TableContext';
import { resolveQr } from '@/services/table.service';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';
import type { TableResolveResponse } from '@/types/table';

/** brandfe's TableInfoPanel: a scanned table starts the table journey; the menu, cart and checkout then order for it. */
export default function OrderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { qr } = useLocalSearchParams<{ qr?: string }>();
  const { startJourney, endJourney } = useTable();
  const [table, setTable] = useState<TableResolveResponse | null>(null);

  useEffect(() => {
    if (!qr) return;
    resolveQr(qr)
      .then(async (resolved) => {
        setTable(resolved);
        await startJourney({ ...resolved, qrToken: qr });
      })
      .catch(() => setTable(null));
  }, [qr, startJourney]);

  const leave = async () => {
    await endJourney();
    router.replace('/home');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.close} onPress={() => router.replace('/home')} hitSlop={8}>
        <X size={22} color={colors.zinc500} />
      </Pressable>
      {!table ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <View style={styles.card}>
          <View style={styles.badge}>
            <QrCode size={13} color={colors.primary} />
            <Text style={styles.badgeText}>QR</Text>
          </View>
          <Text style={styles.table}>{t('table.welcome', { table: table.tableLabel })}</Text>
          <View style={styles.line}>
            <Utensils size={15} color={colors.primary} />
            <Text style={styles.lineText}>{t('table.served')}</Text>
          </View>
          <View style={styles.chips}>
            {table.checkoutOptions.payNow ? (
              <View style={styles.chip}>
                <CreditCard size={13} color={colors.zinc600} />
                <Text style={styles.chipText}>{t('table.payNow')}</Text>
              </View>
            ) : null}
            {table.checkoutOptions.payLater ? (
              <View style={styles.chip}>
                <Wallet size={13} color={colors.zinc600} />
                <Text style={styles.chipText}>{t('table.payLater')}</Text>
              </View>
            ) : null}
          </View>
          <Button label={t('table.menu')} onPress={() => router.replace('/menu')} />
          <Pressable onPress={leave} style={{ alignSelf: 'center' }} hitSlop={8}>
            <Text style={styles.leave}>{t('table.ended')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.lg },
  close: { alignSelf: 'flex-end', padding: 4 },
  card: {
    marginTop: 12,
    padding: space.xxl,
    gap: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.orange50,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { fontSize: font.small, fontWeight: '700', color: colors.primary },
  table: { fontSize: font.heading + 2, fontWeight: '800', color: colors.zinc800 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineText: { flex: 1, fontSize: font.body, color: colors.zinc600 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.zinc200,
    backgroundColor: colors.zinc50,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: font.small, fontWeight: '600', color: colors.zinc600 },
  leave: { color: colors.zinc500, fontWeight: '600', fontSize: font.body },
});
