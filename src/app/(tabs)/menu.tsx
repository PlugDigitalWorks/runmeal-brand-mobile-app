import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react-native';
import { BranchChip } from '@/components/BranchChip';
import { ProductRow } from '@/components/ProductRow';
import { useStorefront } from '@/context/StorefrontContext';
import { foldText } from '@/lib/text';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Skeleton } from '@/ui/Skeleton';
import { colors, font, radius, space } from '@/theme';
import type { MenuCategory } from '@/types/product';

/** Scroll-spy switches the active pill once a section's top passes this line. */
const SPY_OFFSET = 24;

export default function MenuScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { category: initialCategory } = useLocalSearchParams<{ category?: string }>();
  const { categories, menu, menuStatus, reload } = useStorefront();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const listRef = useRef<ScrollViewInstance>(null);
  const pillsRef = useRef<ScrollViewInstance>(null);
  const sectionY = useRef<Record<string, number>>({});
  const pillX = useRef<Record<string, number>>({});
  const jumping = useRef(false);

  const visible: MenuCategory[] = useMemo(() => {
    const needle = foldText(query.trim());
    if (!needle) return categories;
    return categories
      .map((c) => ({ ...c, products: (c.products ?? []).filter((p) => foldText(p.name).includes(needle)) }))
      .filter((c) => c.products.length > 0);
  }, [categories, query]);

  // After a branch switch or a search the old active pill may be gone; fall back to the first.
  const currentId = visible.some((c) => c.id === activeId) ? activeId : (visible[0]?.id ?? null);

  const scrollPillIntoView = (id: string) => {
    const x = pillX.current[id];
    if (x != null) pillsRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  };

  const jumpTo = (id: string) => {
    const y = sectionY.current[id];
    if (y == null) return;
    jumping.current = true;
    setActiveId(id);
    scrollPillIntoView(id);
    listRef.current?.scrollTo({ y: Math.max(0, y - 4), animated: true });
    setTimeout(() => (jumping.current = false), 450);
  };

  // A category tapped on the home screen opens the menu scrolled to it.
  useEffect(() => {
    if (!initialCategory || menuStatus !== 'ready') return;
    const timer = setTimeout(() => jumpTo(initialCategory), 60);
    return () => clearTimeout(timer);
    // jumpTo only reads refs; re-running on its identity would re-jump on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory, menuStatus]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (jumping.current) return;
    const y = e.nativeEvent.contentOffset.y + SPY_OFFSET;
    let next = visible[0]?.id ?? null;
    for (const c of visible) {
      if ((sectionY.current[c.id] ?? Infinity) <= y) next = c.id;
    }
    if (next && next !== currentId) {
      setActiveId(next);
      scrollPillIntoView(next);
    }
  };

  const currency = menu?.currency ?? 'TRY';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          {searching ? (
            <View style={styles.searchBox}>
              <Search size={16} color={colors.zinc400} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={t('menu.search')}
                placeholderTextColor={colors.zinc400}
                style={styles.searchInput}
                returnKeyType="search"
              />
              <Pressable
                onPress={() => {
                  setQuery('');
                  setSearching(false);
                }}
                hitSlop={8}
              >
                <X size={18} color={colors.zinc500} />
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('menu.title')}</Text>
              <Pressable onPress={() => setSearching(true)} hitSlop={8} accessibilityLabel={t('menu.search')}>
                <Search size={22} color={colors.zinc700} />
              </Pressable>
            </>
          )}
        </View>
        {!searching ? <BranchChip /> : null}
        <ScrollView
          ref={pillsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          {visible.map((c) => (
            <View key={c.id} onLayout={(e) => (pillX.current[c.id] = e.nativeEvent.layout.x)}>
              <Chip label={c.name} active={c.id === currentId} onPress={() => jumpTo(c.id)} />
            </View>
          ))}
        </ScrollView>
      </View>

      {menuStatus === 'loading' ? (
        <View style={{ padding: space.lg, gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} style={{ height: 88, borderRadius: radius.lg }} />
          ))}
        </View>
      ) : menuStatus === 'error' ? (
        <EmptyState
          icon={<X size={32} color={colors.zinc300} />}
          title={t('menu.error')}
          action={<Button label={t('retry')} variant="outline" onPress={reload} />}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Search size={32} color={colors.zinc300} />} title={query ? t('menu.noResults') : t('menu.empty')} />
      ) : (
        <ScrollView
          // A new branch menu starts from the top with fresh section offsets.
          key={menu?.branchId ?? menu?.brandId}
          ref={listRef}
          onScroll={onScroll}
          scrollEventThrottle={32}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        >
          {visible.map((c) => (
            <View key={c.id} onLayout={(e) => (sectionY.current[c.id] = e.nativeEvent.layout.y)} style={styles.section}>
              <Text style={styles.sectionTitle}>{c.name}</Text>
              <View style={styles.card}>
                {(c.products ?? []).map((p, index) => (
                  <View key={p.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <ProductRow
                      product={p}
                      currency={currency}
                      onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.zinc200,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  title: { fontSize: font.display, fontWeight: '800', color: colors.zinc900 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.zinc100,
  },
  searchInput: { flex: 1, fontSize: font.base, color: colors.zinc900 },
  pills: { gap: 8, paddingVertical: 10 },
  list: { padding: space.lg, paddingBottom: 48, gap: space.xl },
  section: { gap: 10 },
  sectionTitle: { fontSize: font.title + 2, fontWeight: '800', color: colors.zinc800 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.zinc100, marginHorizontal: 12 },
});
