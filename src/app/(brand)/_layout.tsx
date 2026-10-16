import { Pressable, Text } from 'react-native';
import { Redirect, Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BrandSwitcherButton } from '@/components/BrandSwitcherButton';
import { useBrand } from '@/context/BrandContext';

export default function BrandLayout() {
  const { t } = useTranslation();
  const { brand, ready } = useBrand();
  if (ready && !brand) return <Redirect href="/brands" />;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        headerTitle: () => <BrandSwitcherButton />,
        headerRight: () => (
          <Pressable onPress={() => router.push('/scan')} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: '#f5a623', fontWeight: '600' }}>{t('scan.title')}</Text>
          </Pressable>
        ),
      }}
    />
  );
}
