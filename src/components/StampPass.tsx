import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StampStrip, WALLET_ORANGE } from '@/components/StampStrip';
import { passState, resolveStampProgress } from '@/lib/loyalty';
import type { StampCard } from '@/services/loyalty.service';

type Props = {
  card: StampCard;
  logoUrl: string | null;
  brandName: string;
  /** Already shortened ("Gökhan Ç."), the way the Wallet pass prints it. */
  customerName: string | null;
  /** The member QR, or its loading / error placeholder. */
  qr: React.ReactNode;
};

/**
 * One loyalty card drawn the way Apple Wallet draws its storeCard pass, as on
 * brandfe's /rewards: logo and status, the stamp strip, campaign / stamps left /
 * customer, and the QR on the card itself.
 */
export function StampPass({ card, logoUrl, brandName, customerName, qr }: Props) {
  const { t } = useTranslation();
  const progress = resolveStampProgress(card);
  const state = passState(card);
  const status =
    state === 'ready' ? t('rewards.pass.ready') : state === 'paused' ? t('rewards.pass.paused') : `${progress.earned} / ${progress.target}`;

  const expiresAt = card.rewardExpiresAt ? new Date(card.rewardExpiresAt) : null;
  const expires =
    expiresAt && !Number.isNaN(expiresAt.getTime())
      ? expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

  return (
    <View style={styles.pass}>
      <View style={styles.header}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" contentPosition="left" accessibilityLabel={brandName} />
        ) : (
          <Text style={styles.brandName} numberOfLines={1}>
            {brandName}
          </Text>
        )}
        <View style={styles.statusBox}>
          <Text style={styles.label}>{t('rewards.pass.status')}</Text>
          <Text style={[styles.status, state === 'collecting' && styles.statusCounting]}>{status}</Text>
        </View>
      </View>

      <StampStrip count={progress.earned} threshold={progress.target} state={state} />

      <View style={styles.fields}>
        <Field label={t('rewards.pass.campaign')} value={card.campaignName} grow />
        {state === 'ready' ? (
          expires ? <Field label={t('rewards.pass.expires')} value={expires} /> : null
        ) : (
          <Field label={t('rewards.pass.remaining')} value={String(progress.remaining)} />
        )}
        {customerName ? <Field label={t('rewards.pass.customer')} value={customerName} right /> : null}
      </View>

      <View style={styles.qrWrap}>
        <View style={styles.qr}>{qr}</View>
      </View>
    </View>
  );
}

function Field({ label, value, grow, right }: { label: string; value: string; grow?: boolean; right?: boolean }) {
  return (
    <View style={[grow ? styles.grow : null, right ? styles.right : null]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, right ? styles.rightText : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export const PASS_QR_SIZE = 180;

const styles = StyleSheet.create({
  pass: {
    borderRadius: 14,
    backgroundColor: WALLET_ORANGE,
    overflow: 'hidden',
    shadowColor: WALLET_ORANGE,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  logo: { height: 28, width: '45%' },
  brandName: { flexShrink: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  statusBox: { alignItems: 'flex-end' },
  label: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  status: { color: '#FFFFFF', fontSize: 18, fontWeight: '300', marginTop: 2, fontVariant: ['tabular-nums'] },
  statusCounting: { letterSpacing: 1.4 },
  fields: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  grow: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end', maxWidth: '40%' },
  value: { color: '#FFFFFF', fontSize: 16, fontWeight: '300', marginTop: 2 },
  rightText: { textAlign: 'right' },
  qrWrap: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 22 },
  qr: {
    width: PASS_QR_SIZE + 20,
    height: PASS_QR_SIZE + 20,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
