import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, QrCode } from 'lucide-react-native';
import { BrandHeader } from '@/components/BrandHeader';
import { BranchChip } from '@/components/BranchChip';
import { useBrand } from '@/context/BrandContext';
import { useStorefront } from '@/context/StorefrontContext';
import { Price } from '@/ui/Price';
import { Skeleton } from '@/ui/Skeleton';
import { colors, font, radius, shadow, space } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { brand } = useBrand();
  const { branch, categories, menu, menuStatus } = useStorefront();
  const banner = branch?.bannerUrls?.[0];
  const popular = categories.flatMap((c) => c.products ?? []).filter((p) => p.imageUrl).slice(0, 8);
  const currency = menu?.currency ?? brand?.currency ?? 'TRY';

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <BranchChip />

        {banner ? (
          <Image source={{ uri: banner }} style={styles.banner} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.banner, styles.bannerFallback]}>
            <Text style={styles.bannerTitle}>{brand?.name}</Text>
          </View>
        )}

        <Pressable style={styles.tableCard} onPress={() => router.push('/scan')} accessibilityRole="button">
          <View style={styles.tableIcon}>
            <QrCode size={22} color={colors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tableTitle}>{t('home.tableTitle')}</Text>
            <Text style={styles.tableBody}>{t('home.tableBody')}</Text>
          </View>
          <ChevronRight size={20} color={colors.zinc400} />
        </Pressable>

        <SectionHeader title={t('home.categories')} action={t('home.seeMenu')} onAction={() => router.push('/menu')} />
        {menuStatus === 'loading' ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} style={styles.categorySkeleton} />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((category) => {
              const image = category.products?.find((p) => p.imageUrl)?.imageUrl;
              return (
                <Pressable
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => router.push({ pathname: '/menu', params: { category: category.id } })}
                >
                  <Image source={image ? { uri: image } : undefined} style={styles.categoryImage} contentFit="cover" />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {popular.length > 0 ? (
          <>
            <SectionHeader title={t('home.popular')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
              {popular.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.popularCard}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
                >
                  <Image source={{ uri: product.imageUrl! }} style={styles.popularImage} contentFit="cover" />
                  <View style={{ padding: 10, gap: 2 }}>
                    <Text style={styles.popularName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Price value={product.discountedPrice ?? product.price} currency={currency} style={styles.popularPrice} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 40 },
  banner: { width: '100%', aspectRatio: 3, borderRadius: radius.xl, backgroundColor: colors.accent },
  bannerFallback: { backgroundColor: colors.primary, justifyContent: 'flex-end', padding: space.lg },
  bannerTitle: { color: colors.primaryForeground, fontSize: font.heading, fontWeight: '800' },
  tableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.zinc900,
  },
  tableIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tableTitle: { color: colors.primaryForeground, fontSize: font.base, fontWeight: '700' },
  tableBody: { color: colors.zinc400, fontSize: font.small + 1, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: -4 },
  sectionTitle: { fontSize: font.title + 1, fontWeight: '800', color: colors.zinc900 },
  sectionAction: { fontSize: font.body, fontWeight: '600', color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  categoryImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.zinc100 },
  categoryName: { padding: 10, fontSize: font.body, fontWeight: '700', color: colors.zinc800 },
  categorySkeleton: { width: '47.5%', height: 150, borderRadius: radius.lg },
  popularRow: { gap: 12, paddingRight: 4 },
  popularCard: {
    width: 150,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  popularImage: { width: '100%', height: 110, backgroundColor: colors.zinc100 },
  popularName: { fontSize: font.body, fontWeight: '700', color: colors.zinc800 },
  popularPrice: { fontSize: font.small + 1, fontWeight: '600', color: colors.zinc600 },
});
