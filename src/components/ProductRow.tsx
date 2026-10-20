import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { Price } from '@/ui/Price';
import { colors, font, radius } from '@/theme';
import type { Product } from '@/types/product';
import { BRAND_LOGO } from '@brand';

type Props = { product: Product; currency: string; onPress: () => void };

/** brandfe's menu row (thumbnail, bold name, two-line description, price) with the add button on the thumb side. */
export function ProductRow({ product, currency, onPress }: Props) {
  const discounted = product.discountedPrice != null && Number(product.discountedPrice) < Number(product.price);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.zinc50 }]} onPress={onPress}>
      <Image
        source={product.imageUrl ? { uri: product.imageUrl } : BRAND_LOGO}
        style={styles.thumb}
        contentFit={product.imageUrl ? 'cover' : 'contain'}
        transition={150}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {product.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          <Price value={discounted ? product.discountedPrice : product.price} currency={currency} style={styles.price} />
          {discounted ? <Price value={product.price} currency={currency} style={styles.strike} /> : null}
        </View>
      </View>
      <View style={styles.add}>
        <Plus size={18} color={colors.primaryForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.lg },
  thumb: { width: 76, height: 76, borderRadius: radius.lg, backgroundColor: colors.zinc100 },
  body: { flex: 1, gap: 3 },
  name: { fontSize: font.base, fontWeight: '700', color: colors.zinc800 },
  description: { fontSize: font.small, color: colors.zinc500, lineHeight: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  price: { fontSize: font.body + 1, fontWeight: '700', color: colors.zinc800 },
  strike: { fontSize: font.small, color: colors.zinc400, textDecorationLine: 'line-through' },
  add: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
