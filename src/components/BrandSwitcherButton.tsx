import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react-native';
import { useBrand } from '@/context/BrandContext';
import { colors, font } from '@/theme';

/** The active cafe; tapping it opens the cafe picker. */
export function BrandSwitcherButton() {
  const { t } = useTranslation();
  const { brand } = useBrand();
  if (!brand) return null;

  return (
    <Pressable
      onPress={() => router.push('/brands')}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={t('header.switchBrand')}
    >
      {brand.logoUrl ? (
        <Image source={{ uri: brand.logoUrl }} style={styles.logo} contentFit="contain" />
      ) : (
        <View style={[styles.logo, styles.placeholder]} />
      )}
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {brand.name}
        </Text>
        <View style={styles.hintRow}>
          <Text style={styles.hint}>{t('header.switchBrand')}</Text>
          <ChevronDown size={12} color={colors.zinc500} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 260 },
  logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.zinc100 },
  placeholder: { backgroundColor: colors.primary },
  name: { fontSize: font.base + 1, fontWeight: '700', color: colors.zinc900 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hint: { fontSize: font.small, color: colors.zinc500 },
});
