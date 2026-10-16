import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { CircleAlert, Wallet } from 'lucide-react-native';
import { GOOGLE_WALLET_BADGE, GOOGLE_WALLET_BADGE_SIZE } from '@/components/google-wallet-badge';
import { apiErrorMessage } from '@/lib/api-error';
import { parseAppleWalletUrl, parseGoogleWalletUrl } from '@/lib/loyalty';
import { createAppleWalletLink, createGoogleWalletLink } from '@/services/loyalty.service';
import { colors, radius } from '@/theme';

type Props = { brandId: string; campaignId: string };

/**
 * brandfe's "Add to Apple Wallet" / "Add to Google Wallet" for one stamp card.
 * The backend signs the pass and returns a link; the phone opens it: Safari
 * shows the Wallet "Add" sheet for a `.pkpass`, and Android hands Google's save
 * page to Google Wallet. Each platform only shows its own wallet.
 */
export function WalletButton({ brandId, campaignId }: Props) {
  const { t } = useTranslation();
  const apple = Platform.OS === 'ios';
  const prefix = apple ? 'rewards.appleWallet' : 'rewards.googleWallet';
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not state: two taps in the same frame both see stale state.
  const inFlight = useRef(false);

  const add = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setCreating(true);
    setError(null);
    try {
      const result = apple ? await createAppleWalletLink(brandId, campaignId) : await createGoogleWalletLink(brandId, campaignId);
      const url = apple ? parseAppleWalletUrl(result?.url) : parseGoogleWalletUrl(result?.url);
      if (!url) return setError(t(`${prefix}.error`));
      await Linking.openURL(url);
    } catch (e) {
      setError(apiErrorMessage(e, t(`${prefix}.error`)));
    } finally {
      inFlight.current = false;
      setCreating(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {apple ? (
        <Pressable
          onPress={add}
          disabled={creating}
          accessibilityRole="button"
          accessibilityState={{ busy: creating }}
          style={({ pressed }) => [styles.apple, (pressed || creating) && { opacity: 0.8 }]}
        >
          {creating ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Wallet size={18} color="#FFFFFF" />}
          <Text style={styles.appleText}>{creating ? t('rewards.appleWallet.creating') : t('rewards.appleWallet.add')}</Text>
        </Pressable>
      ) : (
        // Google's brand rules: the official badge, unmodified and never stretched.
        <Pressable
          onPress={add}
          disabled={creating}
          accessibilityRole="button"
          accessibilityLabel={creating ? t('rewards.googleWallet.creating') : t('rewards.googleWallet.add')}
          style={({ pressed }) => [styles.google, (pressed || creating) && { opacity: 0.7 }]}
        >
          <SvgXml xml={GOOGLE_WALLET_BADGE} width={BADGE_WIDTH} height={BADGE_HEIGHT} />
          {creating ? <ActivityIndicator color="#FFFFFF" style={StyleSheet.absoluteFill} /> : null}
        </Pressable>
      )}
      {error ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <CircleAlert size={13} color={colors.destructive} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const BADGE_HEIGHT = 48;
const BADGE_WIDTH = (GOOGLE_WALLET_BADGE_SIZE.width / GOOGLE_WALLET_BADGE_SIZE.height) * BADGE_HEIGHT;

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  apple: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    backgroundColor: '#000000',
  },
  appleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  google: { alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
  errorRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  error: { flex: 1, color: colors.destructive, fontSize: 12, lineHeight: 16 },
});
