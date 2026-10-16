import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Globe, User } from 'lucide-react-native';
import { useBrand } from '@/context/BrandContext';
import { chooseLanguage } from '@/i18n';
import { colors, font, radius, space } from '@/theme';

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
] as const;

/** Part 4 adds sign-in, orders and rewards; for now: cafe and language. */
export default function AccountScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{t('account.title')}</Text>

      <View style={styles.notice}>
        <View style={styles.noticeIcon}>
          <User size={22} color={colors.primary} />
        </View>
        <Text style={styles.noticeText}>{t('account.signInSoon')}</Text>
      </View>

      <Text style={styles.label}>{t('account.cafe')}</Text>
      <Pressable style={styles.card} onPress={() => router.push('/brands')}>
        {brand?.logoUrl ? <Image source={{ uri: brand.logoUrl }} style={styles.logo} contentFit="contain" /> : null}
        <Text style={styles.cardText}>{brand?.name}</Text>
        <Text style={styles.link}>{t('account.change')}</Text>
        <ChevronRight size={18} color={colors.zinc400} />
      </Pressable>

      <Text style={styles.label}>{t('account.language')}</Text>
      <View style={styles.segment}>
        {LANGUAGES.map(({ code, label }) => {
          const on = i18n.language === code;
          return (
            <Pressable key={code} style={[styles.segmentItem, on && styles.segmentOn]} onPress={() => chooseLanguage(code)}>
              {on ? <Globe size={14} color={colors.zinc900} /> : null}
              <Text style={[styles.segmentText, on && { color: colors.zinc900 }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, paddingBottom: 40, gap: 12 },
  title: { fontSize: font.display, fontWeight: '800', color: colors.zinc900, marginBottom: 4, letterSpacing: -0.5 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.orange50, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1, fontSize: font.body, color: colors.zinc600, lineHeight: 20 },
  label: { fontSize: font.small, fontWeight: '700', color: colors.zinc500, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.zinc200,
  },
  logo: { width: 36, height: 36, borderRadius: 18 },
  cardText: { flex: 1, fontSize: font.base, fontWeight: '700', color: colors.zinc800 },
  link: { fontSize: font.body, fontWeight: '600', color: colors.primary },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.lg, backgroundColor: colors.zinc100 },
  segmentItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.md },
  segmentOn: { backgroundColor: colors.card },
  segmentText: { fontSize: font.body, fontWeight: '600', color: colors.zinc500 },
});
