import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Lock, X } from 'lucide-react-native';
import { MemberCard } from '@/components/MemberCard';
import { useBrand } from '@/context/BrandContext';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';

/**
 * brandfe's MemberQrScreen. Every /loyalty/stamps endpoint needs a signed-in
 * customer, so until sign-in lands (part 3) this is the signed-out card.
 */
export default function RewardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topBar}>
          <Text style={styles.heading}>{t('rewards.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close">
            <X size={24} color={colors.zinc500} />
          </Pressable>
        </View>

        <MemberCard
          name={t('rewards.guest')}
          subtitle={brand?.name ?? ''}
          title={t('rewards.cardTitle')}
          status={t('rewards.cardStatus')}
          earned={0}
          target={null}
        />

        <Text style={styles.instruction}>{t('rewards.signInBody')}</Text>

        <View style={styles.qrLocked}>
          <View style={styles.lockCircle}>
            <Lock size={28} color={colors.zinc400} />
          </View>
          <Text style={styles.qrLockedText}>{t('rewards.qrLocked')}</Text>
        </View>

        <Button label={t('rewards.signIn')} onPress={() => Alert.alert(t('rewards.signIn'), t('rewards.signInSoon'))} />
        <Text style={styles.note}>{t('rewards.qrPagePermanent')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  content: { padding: space.xl, gap: space.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: font.heading, fontWeight: '800', color: colors.zinc900 },
  instruction: { fontSize: font.body + 1, lineHeight: 22, color: colors.zinc600, textAlign: 'center', paddingHorizontal: 8 },
  qrLocked: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.zinc200,
    backgroundColor: colors.zinc50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  lockCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  qrLockedText: { fontSize: font.body, color: colors.zinc500, textAlign: 'center', lineHeight: 20 },
  note: { fontSize: font.small, color: colors.zinc400, textAlign: 'center', lineHeight: 18 },
});
