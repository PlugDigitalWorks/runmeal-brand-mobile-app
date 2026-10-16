import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react-native';
import { useBrand } from '@/context/BrandContext';
import { useCart } from '@/context/CartContext';
import { useStorefront } from '@/context/StorefrontContext';
import { apiErrorMessage } from '@/lib/api-error';
import {
  initialSelections,
  optionsTotal,
  toggleOption,
  validateSelections,
  type Selections,
} from '@/lib/product-options';
import { formatMoney } from '@/lib/money';
import { getProduct } from '@/services/menu.service';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Price } from '@/ui/Price';
import { QuantityStepper } from '@/ui/QuantityStepper';
import { colors, font, radius, space } from '@/theme';
import type { OptionGroup, Product } from '@/types/product';

const FALLBACK = require('@/../assets/images/runmeal-mark.png');

/** brandfe's ProductDetailModal as a bottom sheet: hero image, option cards, note, stepper and CTA. */
export default function ProductSheet() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { brand } = useBrand();
  const { branch, menu } = useStorefront();
  const [product, setProduct] = useState<Product | null>(null);
  const [failed, setFailed] = useState(false);
  const [selections, setSelections] = useState<Selections>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const cart = useCart();

  useEffect(() => {
    let cancelled = false;
    getProduct(id, branch?.id ?? null)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setSelections(initialSelections(p.optionGroups ?? []));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id, branch?.id]);

  const groups = useMemo(
    () => [...(product?.optionGroups ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [product],
  );
  const currency = menu?.currency ?? brand?.currency ?? 'TRY';
  const unit = Number(product?.discountedPrice ?? product?.price ?? 0) + optionsTotal(groups, selections);
  const total = unit * quantity;

  const onToggle = (group: OptionGroup, optionId: string) => {
    const result = toggleOption(selections, group, optionId);
    setSelections(result.selections);
    setMessage(result.rejected ? t('product.maxError', { count: result.rejected.count }) : null);
  };

  const onAdd = async () => {
    if (!product) return;
    const problem = validateSelections(groups, selections);
    if (problem) {
      setMessage(
        problem.reason === 'min'
          ? t('product.minError', { name: problem.groupName, count: problem.count })
          : t('product.requiredError', { name: problem.groupName }),
      );
      return;
    }
    if (!branch) {
      setMessage(t('product.noBranch'));
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      await cart.add(product, groups, selections, quantity, note);
      router.back();
    } catch (error) {
      setMessage(apiErrorMessage(error, t('product.addFailed')));
    } finally {
      setAdding(false);
    }
  };

  const close = (
    <Pressable style={styles.close} onPress={() => router.back()} accessibilityLabel="Close" hitSlop={8}>
      <X size={20} color={colors.zinc800} />
    </Pressable>
  );

  if (failed) {
    return (
      <View style={styles.sheet}>
        {close}
        <EmptyState icon={<X size={32} color={colors.zinc300} />} title={t('product.error')} />
      </View>
    );
  }
  if (!product) {
    return (
      <View style={[styles.sheet, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const discounted = product.discountedPrice != null && Number(product.discountedPrice) < Number(product.price);

  return (
    <View style={styles.sheet}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Image
          source={product.imageUrl ? { uri: product.imageUrl } : FALLBACK}
          style={styles.hero}
          contentFit={product.imageUrl ? 'cover' : 'contain'}
        />
        <View style={styles.body}>
          <Text style={styles.title}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Price value={discounted ? product.discountedPrice : product.price} currency={currency} style={styles.price} />
            {discounted ? <Price value={product.price} currency={currency} style={styles.strike} /> : null}
          </View>
          {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

          {groups.map((group) => (
            <OptionGroupBlock
              key={group.id}
              group={group}
              selected={selections[group.id] ?? []}
              currency={currency}
              onToggle={(optionId) => onToggle(group, optionId)}
            />
          ))}

          <View style={styles.group}>
            <Text style={styles.groupTitle}>{t('product.note')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('product.notePlaceholder')}
              placeholderTextColor={colors.zinc400}
              multiline
              maxLength={1000}
              style={styles.note}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.footerRow}>
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <Button
            label={t('product.addToCart')}
            trailing={formatMoney(total, currency)}
            onPress={onAdd}
            loading={adding}
            style={{ flex: 1 }}
          />
        </View>
      </View>
      {close}
    </View>
  );
}

function OptionGroupBlock({
  group,
  selected,
  currency,
  onToggle,
}: {
  group: OptionGroup;
  selected: string[];
  currency: string;
  onToggle: (optionId: string) => void;
}) {
  const { t } = useTranslation();
  const single = group.type === 'SINGLE' || group.type === 'VARIANT';
  const rule =
    group.minSelections && group.minSelections > 1
      ? t('product.selectAtLeast', { count: group.minSelections })
      : group.isRequired
        ? t('product.chooseOne')
        : null;

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupTitle}>{group.name}</Text>
          {rule ? <Text style={styles.groupRule}>{rule}</Text> : null}
          {!single && group.maxSelections ? (
            <Text style={styles.groupMax}>{t('product.max', { count: group.maxSelections })}</Text>
          ) : null}
        </View>
        <Text style={[styles.tag, group.isRequired ? styles.tagRequired : styles.tagOptional]}>
          {group.isRequired ? t('product.required') : t('product.optional')}
        </Text>
      </View>
      {[...group.options]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => {
          const on = selected.includes(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onToggle(option.id)}
              style={[styles.option, on ? styles.optionOn : styles.optionOff]}
              accessibilityRole={single ? 'radio' : 'checkbox'}
              accessibilityState={{ checked: on }}
            >
              <View style={[single ? styles.radio : styles.checkbox, on && styles.markOn]}>
                {on ? single ? <View style={styles.radioDot} /> : <Check size={14} color={colors.primaryForeground} /> : null}
              </View>
              <Text style={[styles.optionName, on && { color: colors.orange700 }]}>{option.name}</Text>
              {Number(option.priceDelta) === 0 ? (
                <Text style={styles.free}>{t('product.free')}</Text>
              ) : (
                <Text style={styles.delta}>
                  +<Price value={option.priceDelta} currency={currency} />
                </Text>
              )}
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.card },
  hero: { width: '100%', height: 260, backgroundColor: colors.zinc100 },
  close: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: space.xl, gap: space.xl },
  title: { fontSize: font.heading + 2, fontWeight: '800', color: colors.zinc800 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: -12 },
  price: { fontSize: font.heading - 2, fontWeight: '800', color: colors.primary },
  strike: { fontSize: font.body, color: colors.zinc400, textDecorationLine: 'line-through' },
  description: { fontSize: font.body, color: colors.zinc600, lineHeight: 21, marginTop: -8 },
  group: { gap: 8, paddingBottom: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.zinc100 },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 2 },
  groupTitle: { fontSize: font.title, fontWeight: '700', color: colors.zinc800 },
  groupRule: { fontSize: font.body, color: colors.zinc500, marginTop: 2 },
  groupMax: { fontSize: font.small, color: colors.zinc400 },
  tag: { fontSize: font.small, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, overflow: 'hidden' },
  tagRequired: { backgroundColor: colors.zinc100, color: colors.zinc600 },
  tagOptional: { backgroundColor: colors.zinc50, color: colors.zinc400 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.orange50 },
  optionOff: { borderColor: colors.zinc200, backgroundColor: colors.card },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.zinc300, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.zinc300, alignItems: 'center', justifyContent: 'center' },
  markOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryForeground },
  optionName: { flex: 1, fontSize: font.base - 1, fontWeight: '600', color: colors.zinc700 },
  free: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  delta: { fontSize: font.body, fontWeight: '600', color: colors.zinc600 },
  note: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.zinc200,
    borderRadius: radius.md,
    padding: 12,
    fontSize: font.body,
    color: colors.zinc800,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: 12,
    gap: 8,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.zinc100,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  message: { fontSize: font.small + 1, color: colors.orange700, textAlign: 'center' },
});
