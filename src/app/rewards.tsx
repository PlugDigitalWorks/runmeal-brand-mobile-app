import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { Lock, RefreshCw, X } from 'lucide-react-native';
import { MemberCard } from '@/components/MemberCard';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { getMemberQr, getStampCards, type StampCard, type StampQr } from '@/services/loyalty.service';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';

/** brandfe's MemberQrScreen: the member card, the QR the till scans, and the stamp progress. */
export default function RewardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();
  const { user, isMember } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; qr: StampQr | null; cards: StampCard[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (!isMember || !brand) return;
    let cancelled = false;
    Promise.all([getMemberQr(), getStampCards(brand.brandId)])
      .then(([qr, cards]) => !cancelled && setResult({ attempt, qr, cards, failed: false }))
      .catch(() => !cancelled && setResult({ attempt, qr: null, cards: [], failed: true }));
    return () => {
      cancelled = true;
    };
  }, [isMember, brand, attempt]);

  const current = result?.attempt === attempt ? result : null;
  const status = !current ? 'loading' : current.failed ? 'error' : 'ready';
  const qr = current?.qr ?? null;
  const cards = current?.cards ?? [];
  const load = () => setAttempt((n) => n + 1);

  const card = cards[0] ?? null;
  const name = isMember && user ? `${user.firstName} ${user.lastName}` : t('rewards.guest');
  const cardStatus = !isMember
    ? t('rewards.cardStatus')
    : card
      ? card.status === 'REWARD_AVAILABLE'
        ? t('rewards.ready')
        : t('rewards.stampsLeft', { count: card.remainingStamps, category: card.category.name })
      : t('rewards.noCampaign');

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
          name={name}
          subtitle={brand?.name ?? ''}
          title={card?.campaignName ?? t('rewards.cardTitle')}
          status={cardStatus}
          earned={card?.stampCount ?? 0}
          target={card?.stampThreshold ?? null}
        />

        {isMember ? (
          <>
            <Text style={styles.instruction}>{t('rewards.instruction')}</Text>
            <View style={styles.qrBox}>
              {status === 'loading' ? (
                <ActivityIndicator color={colors.primary} />
              ) : status === 'error' || !qr ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <Text style={styles.qrLockedText}>{t('rewards.loadError')}</Text>
                  <Pressable style={styles.retry} onPress={load}>
                    <RefreshCw size={14} color={colors.zinc700} />
                    <Text style={styles.retryText}>{t('retry')}</Text>
                  </Pressable>
                </View>
              ) : (
                <QRCode value={qr.qrValue} size={220} color={colors.zinc900} backgroundColor={colors.card} />
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.instruction}>{t('rewards.signInBody')}</Text>
            <View style={[styles.qrBox, styles.qrLocked]}>
              <View style={styles.lockCircle}>
                <Lock size={28} color={colors.zinc400} />
              </View>
              <Text style={styles.qrLockedText}>{t('rewards.qrLocked')}</Text>
            </View>
            <Button label={t('rewards.signIn')} onPress={() => router.push('/login')} />
          </>
        )}
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
  qrBox: { alignSelf: 'center', width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  qrLocked: {
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.zinc200,
    backgroundColor: colors.zinc50,
    gap: 12,
    padding: 24,
  },
  lockCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  qrLockedText: { fontSize: font.body, color: colors.zinc500, textAlign: 'center', lineHeight: 20 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.zinc200,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { fontSize: font.small, fontWeight: '700', color: colors.zinc700 },
  note: { fontSize: font.small, color: colors.zinc400, textAlign: 'center', lineHeight: 18 },
});
