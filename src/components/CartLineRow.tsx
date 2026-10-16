import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import type { CartLine } from '@/lib/cart-model';
import { formatMoney } from '@/lib/money';
import { colors, font, radius } from '@/theme';

const FALLBACK = require('@/../assets/images/runmeal-mark.png');

type Props = { line: CartLine; currency: string; busy?: boolean; onQty: (qty: number) => void };

/** brandfe's cart row: name, options, note, a stepper whose minus becomes a bin at one, and the line price. */
export function CartLineRow({ line, currency, busy, onQty }: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.row, busy && { opacity: 0.5 }]}>
      <Image source={line.imageUrl ? { uri: line.imageUrl } : FALLBACK} style={styles.thumb} contentFit={line.imageUrl ? 'cover' : 'contain'} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name}>{line.name}</Text>
        {line.optionsText ? <Text style={styles.meta}>{line.optionsText}</Text> : null}
        {line.note ? <Text style={styles.meta}>{t('cart.note', { note: line.note })}</Text> : null}
        <View style={styles.bottom}>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => onQty(line.qty - 1)}
              disabled={busy}
              style={[styles.step, line.qty === 1 && styles.stepDanger]}
              accessibilityLabel={line.qty === 1 ? t('cart.remove') : '-'}
            >
              {line.qty === 1 ? <Trash2 size={14} color={colors.destructive} /> : <Minus size={14} color={colors.zinc600} />}
            </Pressable>
            <Text style={styles.qty}>{line.qty}</Text>
            <Pressable onPress={() => onQty(line.qty + 1)} disabled={busy} style={styles.step} accessibilityLabel="+">
              <Plus size={14} color={colors.zinc600} />
            </Pressable>
          </View>
          <Text style={styles.price}>{formatMoney(line.lineTotal, currency)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 14 },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.zinc100 },
  name: { fontSize: font.base - 1, fontWeight: '700', color: colors.zinc800 },
  meta: { fontSize: font.small, color: colors.zinc500 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.zinc200,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDanger: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  qty: { minWidth: 20, textAlign: 'center', fontWeight: '700', fontSize: font.body, color: colors.zinc800 },
  price: { fontSize: font.body + 1, fontWeight: '700', color: colors.zinc800 },
});
