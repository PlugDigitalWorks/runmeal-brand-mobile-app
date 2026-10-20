import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BrandWordmark } from '@/components/BrandLogo';
import { useBrand } from '@/context/BrandContext';
import { consumeInstallReferrerUrl } from '@/lib/install-referrer';
import { toLinkRoute } from '@/lib/links';
import { Button } from '@/ui/Button';
import { colors, font } from '@/theme';

/** Cold start without a link: a table QR from the install referrer, otherwise the storefront. */
export default function Index() {
  const { t } = useTranslation();
  const { brand, ready, failed, retry } = useBrand();
  const [referrerUrl, setReferrerUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    consumeInstallReferrerUrl().then(setReferrerUrl);
  }, []);

  if (failed) {
    return (
      <View style={styles.center}>
        <BrandWordmark height={40} />
        <Text style={styles.message}>{t('brand.loadError')}</Text>
        <Button label={t('retry')} onPress={retry} />
      </View>
    );
  }
  if (!ready || !brand || referrerUrl === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (referrerUrl) return <Redirect href={toLinkRoute(referrerUrl) as Href} />;
  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 },
  message: { textAlign: 'center', fontSize: font.base, color: colors.zinc600, lineHeight: 22 },
});
