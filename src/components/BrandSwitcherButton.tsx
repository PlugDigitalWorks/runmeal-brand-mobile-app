import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBrand } from '@/context/BrandContext';
import { colors } from '@/theme';

/** The active cafe's logo; tapping it opens the cafe picker. */
export function BrandSwitcherButton() {
  const { t } = useTranslation();
  const { brand } = useBrand();
  if (!brand) return null;

  return (
    <Pressable
      onPress={() => router.push('/brands')}
      accessibilityRole="button"
      accessibilityLabel={`${brand.name}, ${t('header.switchBrand')}`}
      hitSlop={6}
    >
      {brand.logoUrl ? (
        <Image source={{ uri: brand.logoUrl }} style={styles.logo} contentFit="contain" />
      ) : (
        <View style={[styles.logo, styles.placeholder]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logo: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.zinc100 },
  placeholder: { backgroundColor: colors.primary },
});
