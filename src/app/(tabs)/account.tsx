import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Gift, LogOut, ReceiptText, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';

export default function AccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();
  const { user, isMember, signOut } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{t('account.title')}</Text>

      {isMember && user ? (
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.fullName ?? `${user.firstName} ${user.lastName}`}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.notice}>
          <View style={styles.noticeIcon}>
            <User size={22} color={colors.primary} />
          </View>
          <Text style={styles.noticeText}>{user?.isGuest ? t('account.guest') : t('auth.subtitle')}</Text>
          <Button label={t('account.signIn')} onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
        </View>
      )}

      {isMember ? (
        <View style={styles.group}>
          <Row icon={<ReceiptText size={20} color={colors.zinc700} />} label={t('account.orders')} onPress={() => router.push('/orders')} />
          <View style={styles.divider} />
          <Row icon={<Gift size={20} color={colors.zinc700} />} label={t('rewards.title')} onPress={() => router.push('/rewards')} />
        </View>
      ) : null}

      <Text style={styles.label}>{t('account.cafe')}</Text>
      <Pressable style={styles.card} onPress={() => router.push('/brands')}>
        {brand?.logoUrl ? <Image source={{ uri: brand.logoUrl }} style={styles.logo} contentFit="contain" /> : null}
        <Text style={styles.cardText}>{brand?.name}</Text>
        <Text style={styles.link}>{t('account.change')}</Text>
        <ChevronRight size={18} color={colors.zinc400} />
      </Pressable>

      {user ? (
        <Pressable style={styles.signOut} onPress={signOut}>
          <LogOut size={18} color={colors.destructive} />
          <Text style={styles.signOutText}>{t('account.signOut')}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Row({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {icon}
      <Text style={styles.rowText}>{label}</Text>
      <ChevronRight size={18} color={colors.zinc400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, paddingBottom: 40, gap: 12 },
  title: { fontSize: font.display, fontWeight: '800', color: colors.zinc900, marginBottom: 4, letterSpacing: -0.5 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primaryForeground, fontWeight: '800', fontSize: font.title },
  name: { fontSize: font.title, fontWeight: '800', color: colors.zinc900 },
  email: { fontSize: font.body, color: colors.zinc500, marginTop: 2 },
  notice: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.orange50, alignItems: 'center', justifyContent: 'center' },
  noticeText: { textAlign: 'center', fontSize: font.body, color: colors.zinc600, lineHeight: 20 },
  group: { borderRadius: radius.xl, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  rowText: { flex: 1, fontSize: font.base, fontWeight: '600', color: colors.zinc800 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.zinc100 },
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
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8 },
  signOutText: { color: colors.destructive, fontWeight: '700', fontSize: font.base },
});
