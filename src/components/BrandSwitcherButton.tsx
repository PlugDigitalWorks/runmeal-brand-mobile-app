import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBrand } from '@/context/BrandContext';

/** Header title: the active cafe; tapping it opens the cafe picker. */
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
      <View>
        <Text style={styles.name} numberOfLines={1}>
          {brand.name}
        </Text>
        <Text style={styles.hint}>{t('header.switchBrand')} ▾</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 240 },
  logo: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff' },
  placeholder: { backgroundColor: '#f5a623' },
  name: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 11, color: '#888' },
});
