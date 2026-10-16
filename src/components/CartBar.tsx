import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react-native';
import { useCart } from '@/context/CartContext';
import { useStorefront } from '@/context/StorefrontContext';
import { formatMoney } from '@/lib/money';
import { colors, font, radius, shadow } from '@/theme';

/** Bottom "View cart" bar shown over the menu once something is in the cart (brandfe's MobileCartFab, mobile-app style). */
export function CartBar() {
  const { t } = useTranslation();
  const { summary } = useCart();
  const { menu } = useStorefront();
  if (summary.count === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={({ pressed }) => [styles.bar, pressed && { opacity: 0.92 }]} onPress={() => router.navigate('/cart')}>
        <View style={styles.badge}>
          <ShoppingCart size={18} color={colors.primary} />
          <Text style={styles.count}>{summary.count}</Text>
        </View>
        <Text style={styles.label}>{t('cart.viewCart')}</Text>
        <Text style={styles.total}>{formatMoney(summary.total, menu?.currency ?? 'GBP')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    ...shadow.raised,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  count: { color: colors.primary, fontWeight: '800', fontSize: font.body },
  label: { flex: 1, color: colors.primaryForeground, fontWeight: '700', fontSize: font.base },
  total: { color: colors.primaryForeground, fontWeight: '800', fontSize: font.base },
});
