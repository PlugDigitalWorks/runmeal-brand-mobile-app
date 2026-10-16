import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { useBrand } from '@/context/BrandContext';
import { parseIncomingUrl } from '@/lib/links';
import { resolveBrandByHost } from '@/services/brand.service';
import { resolveQr } from '@/services/table.service';

type LinkError = 'notFound' | 'tableNotFound' | 'brandMismatch';

class LinkFailure extends Error {
  constructor(readonly reason: LinkError) {
    super(reason);
  }
}

/** Resolves an opened or scanned cafe link: host → cafe, optional `qr` → table. */
export default function LinkScreen() {
  const { t } = useTranslation();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const { selectBrand } = useBrand();
  const link = useMemo(() => (url ? parseIncomingUrl(url) : null), [url]);
  const [failure, setFailure] = useState<LinkError | null>(null);
  const error: LinkError | null = link ? failure : 'notFound';

  useEffect(() => {
    if (!link) return;

    (async () => {
      try {
        const brand = await resolveBrandByHost(link.host);
        if (link.qrToken) {
          const table = await resolveQr(link.qrToken).catch((e: unknown) => {
            throw isAxiosError(e) && e.response?.status === 404 ? new LinkFailure('tableNotFound') : e;
          });
          if (table.brandId !== brand.brandId) throw new LinkFailure('brandMismatch');
          await selectBrand(brand);
          router.replace({ pathname: '/order', params: { qr: link.qrToken } });
          return;
        }
        await selectBrand(brand);
        router.replace('/menu');
      } catch (e) {
        setFailure(e instanceof LinkFailure ? e.reason : 'notFound');
      }
    })();
  }, [link, selectBrand]);

  if (!error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>{t('link.opening')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.message}>{t(`link.${error}`)}</Text>
      <Pressable onPress={() => router.replace('/brands')}>
        <Text style={styles.action}>{t('link.goToBrands')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { textAlign: 'center', fontSize: 16 },
  action: { color: '#f5a623', fontWeight: '600', fontSize: 16 },
});
