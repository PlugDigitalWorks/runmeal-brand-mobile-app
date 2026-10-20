import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { useBrand } from '@/context/BrandContext';
import { useTable } from '@/context/TableContext';
import { parseIncomingUrl } from '@/lib/links';
import { resolveQr } from '@/services/table.service';
import { colors } from '@/theme';

type LinkError = 'notFound' | 'tableNotFound' | 'brandMismatch';

class LinkFailure extends Error {
  constructor(readonly reason: LinkError) {
    super(reason);
  }
}

/** Opens a link on the brand's web host: the storefront, or, for a table QR, the menu ordering for that table. */
export default function LinkScreen() {
  const { t } = useTranslation();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const { brand } = useBrand();
  const { startJourney } = useTable();
  const link = useMemo(() => (url ? parseIncomingUrl(url) : null), [url]);
  const [failure, setFailure] = useState<LinkError | null>(null);
  const error: LinkError | null = link ? failure : 'notFound';

  useEffect(() => {
    if (!link || !brand) return;
    if (!link.qrToken) {
      router.replace('/home');
      return;
    }
    const qrToken = link.qrToken;
    resolveQr(qrToken)
      .then(async (table) => {
        if (table.brandId !== brand.brandId) throw new LinkFailure('brandMismatch');
        // The table pins its branch; the header chip then reads "Richmond · Table 1".
        await startJourney({ ...table, qrToken });
        router.replace('/menu');
      })
      .catch((e: unknown) => {
        if (e instanceof LinkFailure) setFailure(e.reason);
        else setFailure(isAxiosError(e) && e.response?.status === 404 ? 'tableNotFound' : 'notFound');
      });
  }, [link, brand, startJourney]);

  if (!error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text>{t('link.opening')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.message}>{t(`link.${error}`)}</Text>
      <Pressable onPress={() => router.replace('/home')}>
        <Text style={styles.action}>{t('link.goHome')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { textAlign: 'center', fontSize: 16 },
  action: { color: colors.primary, fontWeight: '600', fontSize: 16 },
});
