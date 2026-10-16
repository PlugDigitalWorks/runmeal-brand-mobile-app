import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { Lock, RefreshCw, X } from 'lucide-react-native';
import { PASS_QR_SIZE, StampPass } from '@/components/StampPass';
import { WALLET_ORANGE } from '@/components/StampStrip';
import { WalletButton } from '@/components/WalletButton';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { shortName, sortCardsByProgress } from '@/lib/loyalty';
import { getMemberQr, getStampCards, type StampCard, type StampQr } from '@/services/loyalty.service';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';

const SIDE = 24;
const GAP = 10;

/**
 * brandfe's MemberQrScreen: each loyalty card drawn like its Wallet pass with
 * the member QR on it, swipeable when there are several, and the Wallet button
 * for the card in view. The QR is the same for every card: staff see all of a
 * member's cards after one scan.
 */
export default function RewardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { brand } = useBrand();
  const { user, isMember } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; qr: StampQr | null; cards: StampCard[]; failed: boolean } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!isMember || !brand) return;
    let cancelled = false;
    Promise.all([getMemberQr(), getStampCards(brand.brandId).catch(() => [] as StampCard[])])
      .then(([qr, cards]) => !cancelled && setResult({ attempt, qr, cards, failed: false }))
      .catch(() => !cancelled && setResult({ attempt, qr: null, cards: [], failed: true }));
    return () => {
      cancelled = true;
    };
  }, [isMember, brand, attempt]);

  const current = result?.attempt === attempt ? result : null;
  const cards = useMemo(() => current?.cards ?? [], [current]);
  // Lead with whatever is closest to a reward, but keep the customer's swipe.
  const activeCard = cards.find((card) => card.campaignId === picked) ?? sortCardsByProgress(cards)[0] ?? null;
  const customerName = shortName(user?.firstName, user?.lastName);

  const qrNode = current?.qr ? (
    <QRCode value={current.qr.qrValue} size={PASS_QR_SIZE} color={colors.zinc900} backgroundColor="#FFFFFF" />
  ) : current?.failed ? (
    <View style={styles.qrError}>
      <Text style={styles.qrErrorText}>{t('rewards.loadError')}</Text>
      <Pressable style={styles.retry} onPress={() => setAttempt((n) => n + 1)}>
        <RefreshCw size={13} color={colors.zinc700} />
        <Text style={styles.retryText}>{t('retry')}</Text>
      </Pressable>
    </View>
  ) : (
    <ActivityIndicator color={colors.primary} />
  );

  const renderPass = (card: StampCard) => (
    <StampPass card={card} logoUrl={brand?.logoUrl ?? null} brandName={brand?.name ?? ''} customerName={customerName} qr={qrNode} />
  );

  const close = (
    <View style={[styles.topBar, { paddingTop: insets.top > 20 ? 12 : 16 }]}>
      <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('common.close')} style={styles.close}>
        <X size={22} color={colors.zinc500} />
      </Pressable>
    </View>
  );

  if (!isMember) {
    return (
      <View style={styles.screen}>
        {close}
        <ScrollView contentContainerStyle={[styles.guest, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.heading}>{t('rewards.title')}</Text>
          <Text style={styles.body}>{t('rewards.signInBody')}</Text>
          <View style={styles.locked}>
            <View style={styles.lockCircle}>
              <Lock size={28} color={colors.zinc400} />
            </View>
            <Text style={styles.qrErrorText}>{t('rewards.qrLocked')}</Text>
          </View>
          <Button label={t('rewards.signIn')} onPress={() => router.push('/login')} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {close}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {cards.length > 1 ? (
          <Carousel cards={cards} width={width} activeId={activeCard?.campaignId ?? null} onActive={setPicked} renderCard={renderPass} />
        ) : activeCard ? (
          <View style={styles.single}>{renderPass(activeCard)}</View>
        ) : (
          // No card yet (still loading, or no campaign): the code alone still works at the till.
          <View style={styles.bareQr}>{qrNode}</View>
        )}

        <Text style={styles.footer}>{t('rewards.qrPageFooter')}</Text>

        <View style={styles.wallet}>
          {/* Keyed by campaign so switching cards drops the previous card's error and in-flight state. */}
          {activeCard ? <WalletButton key={activeCard.campaignId} brandId={activeCard.brandId} campaignId={activeCard.campaignId} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

type CarouselProps = {
  cards: StampCard[];
  width: number;
  activeId: string | null;
  onActive: (campaignId: string) => void;
  renderCard: (card: StampCard) => React.ReactNode;
};

/** brandfe's StampPassCarousel: one pass per campaign, the neighbour peeking in, opening on the leading card. */
function Carousel({ cards, width, activeId, onActive, renderCard }: CarouselProps) {
  const itemWidth = width - SIDE * 2 - 20;
  const interval = itemWidth + GAP;
  const inset = (width - itemWidth) / 2;
  const [initialIndex] = useState(() => Math.max(0, cards.findIndex((card) => card.campaignId === activeId)));

  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / interval);
    const campaignId = cards[Math.min(Math.max(index, 0), cards.length - 1)]?.campaignId;
    if (campaignId && campaignId !== activeId) onActive(campaignId);
  };

  return (
    <View>
      <FlatList
        horizontal
        data={cards}
        keyExtractor={(card) => card.campaignId}
        renderItem={({ item }) => <View style={{ width: itemWidth }}>{renderCard(item)}</View>}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        contentContainerStyle={{ paddingHorizontal: inset, paddingBottom: 16 }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: interval, offset: interval * index, index })}
        onMomentumScrollEnd={onEnd}
      />
      <View style={styles.dots}>
        {cards.map((card) => (
          <View key={card.campaignId} style={[styles.dot, card.campaignId === activeId && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12 },
  close: { padding: 6, borderRadius: radius.full },
  content: { flexGrow: 1, paddingTop: 4 },
  single: { paddingHorizontal: 16, paddingBottom: 16 },
  bareQr: { alignSelf: 'center', width: PASS_QR_SIZE + 40, height: PASS_QR_SIZE + 40, alignItems: 'center', justifyContent: 'center' },
  footer: {
    alignSelf: 'center',
    maxWidth: 320,
    paddingHorizontal: 24,
    paddingTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.zinc600,
  },
  wallet: { marginTop: 'auto', paddingHorizontal: SIDE, paddingTop: 28 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.zinc300 },
  dotActive: { width: 18, backgroundColor: WALLET_ORANGE },
  qrError: { alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  qrErrorText: { fontSize: font.small, color: colors.zinc500, textAlign: 'center', lineHeight: 18 },
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
  guest: { padding: space.xl, gap: space.xl },
  heading: { fontSize: font.heading, fontWeight: '800', color: colors.zinc900 },
  body: { fontSize: font.body + 1, lineHeight: 22, color: colors.zinc600 },
  locked: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.zinc200,
    backgroundColor: colors.zinc50,
  },
  lockCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.zinc100, alignItems: 'center', justifyContent: 'center' },
});
