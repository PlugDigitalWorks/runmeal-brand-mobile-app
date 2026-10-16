import { useMemo, useState } from 'react';
import { Image as RNImage, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react-native';
import { BrandRow } from '@/components/BrandRow';
import { useBrand } from '@/context/BrandContext';
import { BRAND_DIRECTORY, searchDirectory } from '@/lib/brand-directory';
import { resolveBrandByHost } from '@/services/brand.service';
import { colors, font, radius, space } from '@/theme';
import type { AppBrand, DirectoryEntry } from '@/types/brand';

const RUNMEAL_ICON = require('@/../assets/images/icon.png');

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => (row.kind === 'recent' ? `r-${row.brand.brandId}` : `d-${row.entry.host}`)}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <RNImage source={RUNMEAL_ICON} style={styles.appIcon} />
            <Text style={styles.title}>{t('brands.title')}</Text>
            <View style={styles.searchBox}>
              <Search size={18} color={colors.zinc400} />
              <TextInput
                testID="brand-search"
                style={styles.searchInput}
                placeholder={t('brands.search')}
                placeholderTextColor={colors.zinc400}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
            {error ? <Text style={styles.error}>{t('brands.resolveError')}</Text> : null}
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.rowWrap,
              index === 0 && styles.rowFirst,
              index === section.data.length - 1 && styles.rowLast,
            ]}
          >
            {index > 0 ? <View style={styles.divider} /> : null}
            {item.kind === 'recent' ? (
              <BrandRow name={item.brand.name} logoUrl={item.brand.logoUrl} onPress={() => choose(item)} />
            ) : (
              <BrandRow
                name={item.entry.name}
                logoUrl={item.entry.logoUrl}
                busy={busyHost === item.entry.host}
                onPress={() => choose(item)}
              />
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('brands.empty')}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: space.lg, paddingBottom: 40 },
  header: { paddingTop: space.lg, paddingBottom: space.sm, gap: space.md },
  appIcon: { width: 52, height: 52, borderRadius: 14 },
  title: { fontSize: font.display + 2, fontWeight: '800', color: colors.zinc900, letterSpacing: -0.5 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: font.base, color: colors.zinc900 },
  error: { color: colors.destructive, fontSize: font.body },
  section: {
    paddingTop: space.xl,
    paddingBottom: space.sm,
    fontSize: font.small,
    fontWeight: '700',
    color: colors.zinc500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowWrap: { backgroundColor: colors.card, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 4 },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, paddingBottom: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.zinc100, marginLeft: 72 },
  empty: { textAlign: 'center', marginTop: 24, color: colors.zinc500 },
});
