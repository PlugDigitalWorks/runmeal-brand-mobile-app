import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Coffee, Plus, QrCode } from 'lucide-react-native';
import { BrandHeader } from '@/components/BrandHeader';
import { BranchChip } from '@/components/BranchChip';
import { useBrand } from '@/context/BrandContext';
import { useStorefront } from '@/context/StorefrontContext';
import { greetingFor } from '@/lib/greeting';
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
  const openProduct = (id: string) => router.push({ pathname: '/product/[id]', params: { id } });

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hello}>
          <Text style={styles.greeting}>{t(`home.greeting.${greetingFor(new Date().getHours())}`)}</Text>
          <Text style={styles.ask}>{t('home.ask')}</Text>
        </View>
        <View style={styles.padded}>
          <BranchChip />
        </View>

        {banner ? (
          <View style={styles.padded}>
            <Image source={{ uri: banner }} style={styles.banner} contentFit="cover" transition={200} />
          </View>
        ) : null}

        <View style={[styles.padded, { gap: 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.rewardsCard, pressed && styles.pressed]}
            onPress={() => router.push('/rewards')}
            accessibilityRole="button"
          >
            <View style={styles.seal} />
            <View style={styles.rewardsIcon}>
              <Coffee size={24} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardsTitle}>{t('home.rewardsTitle')}</Text>
              <Text style={styles.rewardsBody}>{t('home.rewardsBody')}</Text>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.tableCard, pressed && styles.pressed]}
            onPress={() => router.push('/scan')}
            accessibilityRole="button"
          >
            <View style={styles.tableIcon}>
              <QrCode size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableTitle}>{t('home.tableTitle')}</Text>
              <Text style={styles.tableBody}>{t('home.tableBody')}</Text>
            </View>
            <ChevronRight size={20} color={colors.zinc400} />
          </Pressable>
        </View>

        <SectionHeader title={t('home.categories')} action={t('home.seeMenu')} onAction={() => router.navigate('/menu')} />
        <View style={styles.grid}>
          {menuStatus === 'loading'
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} style={styles.cardSkeleton} />)
            : categories.map((category) => {
                const image = category.products?.find((p) => p.imageUrl)?.imageUrl;
                return (
                  <Pressable
                    key={category.id}
                    style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
                    onPress={() => router.navigate({ pathname: '/menu', params: { category: category.id } })}
                  >
                    <Image source={image ? { uri: image } : undefined} style={styles.categoryImage} contentFit="cover" />
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
        </View>

        {popular.length > 0 ? (
          <>
            <SectionHeader title={t('home.popular')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {popular.map((product) => (
                <Pressable
                  key={product.id}
                  style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}
                  onPress={() => openProduct(product.id)}
                >
                  <Image source={{ uri: product.imageUrl! }} style={styles.productImage} contentFit="cover" />
                  <View style={styles.productBody}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <View style={styles.productFooter}>
                      <Price value={product.discountedPrice ?? product.price} currency={currency} style={styles.productPrice} />
                      <View style={styles.productAdd}>
                        <Plus size={16} color={colors.primaryForeground} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <Pressable style={styles.menuCta} onPress={() => router.navigate('/menu')}>
          <Text style={styles.menuCtaText}>{t('home.menuCta')}</Text>
          <ChevronRight size={18} color={colors.primary} />
        </Pressable>
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
  content: { paddingTop: space.lg, paddingBottom: 56, gap: space.lg },
  padded: { paddingHorizontal: space.lg },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  hello: { paddingHorizontal: space.lg, gap: 2 },
  greeting: { fontSize: font.display, fontWeight: '800', color: colors.zinc900, letterSpacing: -0.5 },
  ask: { fontSize: font.base, color: colors.zinc500 },
  banner: { width: '100%', aspectRatio: 3, borderRadius: radius.xl, backgroundColor: colors.accent },
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.zinc900,
    overflow: 'hidden',
  },
  seal: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rewardsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsTitle: { color: colors.primaryForeground, fontSize: font.base, fontWeight: '700' },
  rewardsBody: { color: 'rgba(255,255,255,0.6)', fontSize: font.small + 1, marginTop: 2, lineHeight: 18 },
  tableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  tableIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.orange50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableTitle: { color: colors.zinc900, fontSize: font.base, fontWeight: '700' },
  tableBody: { color: colors.zinc500, fontSize: font.small + 1, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginTop: 4,
    marginBottom: -6,
  },
  sectionTitle: { fontSize: font.title + 2, fontWeight: '800', color: colors.zinc900, letterSpacing: -0.3 },
  sectionAction: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  rail: { gap: 12, paddingHorizontal: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: space.lg },
  categoryCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  categoryImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.zinc100 },
  categoryName: { paddingHorizontal: 12, paddingVertical: 10, fontSize: font.body + 1, fontWeight: '700', color: colors.zinc800 },
  cardSkeleton: { width: '47.5%', height: 160, borderRadius: radius.xl },
  productCard: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  productImage: { width: '100%', height: 120, backgroundColor: colors.zinc100 },
  productBody: { padding: 12, gap: 8 },
  productName: { fontSize: font.body + 1, fontWeight: '700', color: colors.zinc800 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: font.body + 1, fontWeight: '700', color: colors.zinc900 },
  productAdd: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  menuCtaText: { fontSize: font.base, fontWeight: '700', color: colors.primary },
});
