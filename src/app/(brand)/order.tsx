import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { resolveQr } from '@/services/table.service';
import type { TableResolveResponse } from '@/types/table';

/** Verification screen for the table journey. The storefront plan replaces it. */
export default function OrderScreen() {
  const { t } = useTranslation();
  const { qr } = useLocalSearchParams<{ qr?: string }>();
  const [table, setTable] = useState<TableResolveResponse | null>(null);

  useEffect(() => {
    if (qr) resolveQr(qr).then(setTable).catch(() => setTable(null));
  }, [qr]);

  if (!table) return <ActivityIndicator style={{ marginTop: 32 }} />;
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>{t('table.welcome', { table: table.tableLabel })}</Text>
    </View>
  );
}
