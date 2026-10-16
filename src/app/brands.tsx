import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BrandRow } from '@/components/BrandRow';
import { ScanButton } from '@/components/ScanButton';
import { useBrand } from '@/context/BrandContext';
import { BRAND_DIRECTORY, searchDirectory } from '@/lib/brand-directory';
import { resolveBrandByHost } from '@/services/brand.service';
import type { AppBrand, DirectoryEntry } from '@/types/brand';

type Row = { kind: 'recent'; brand: AppBrand } | { kind: 'directory'; entry: DirectoryEntry };

export default function BrandsScreen() {
  const { t } = useTranslation();
  const { recent, selectBrand } = useBrand();
  const [search, setSearch] = useState('');
  const [busyHost, setBusyHost] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const sections = useMemo(() => {
    const directory: Row[] = searchDirectory(BRAND_DIRECTORY, search).map((entry) => ({
      kind: 'directory',
      entry,
    }));
    const recentRows: Row[] = recent.map((brand) => ({ kind: 'recent', brand }));
    return [
      ...(search.trim() === '' && recentRows.length ? [{ title: t('brands.recent'), data: recentRows }] : []),
      { title: t('brands.all'), data: directory },
    ];
  }, [search, recent, t]);

  const open = async (brand: AppBrand) => {
    await selectBrand(brand);
    router.replace('/home');
  };

  const choose = async (row: Row) => {
    setError(false);
    if (row.kind === 'recent') return open(row.brand);
    setBusyHost(row.entry.host);
    try {
      await open(await resolveBrandByHost(row.entry.host));
    } catch {
      setError(true);
    } finally {
      setBusyHost(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('brands.title')}</Text>
      <ScanButton />
      <TextInput
        testID="brand-search"
        style={styles.search}
        placeholder={t('brands.search')}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      {error ? <Text style={styles.error}>{t('brands.resolveError')}</Text> : null}
      <SectionList
        sections={sections}
        keyExtractor={(row) => (row.kind === 'recent' ? `r-${row.brand.brandId}` : `d-${row.entry.host}`)}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) =>
          item.kind === 'recent' ? (
            <BrandRow name={item.brand.name} logoUrl={item.brand.logoUrl} onPress={() => choose(item)} />
          ) : (
            <BrandRow
              name={item.entry.name}
              logoUrl={item.entry.logoUrl}
              busy={busyHost === item.entry.host}
              onPress={() => choose(item)}
            />
          )
        }
        ListEmptyComponent={<Text style={styles.empty}>{t('brands.empty')}</Text>}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  search: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, fontSize: 13, fontWeight: '600', color: '#888' },
  error: { marginHorizontal: 16, color: '#c0392b' },
  empty: { textAlign: 'center', marginTop: 24, color: '#888' },
});
