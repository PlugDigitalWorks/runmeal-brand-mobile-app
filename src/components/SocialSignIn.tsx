import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { BRAND } from '@brand';
import { loginWithApple } from '@/services/auth.service';
import type { AuthResponse } from '@/types/auth';
import { colors, font, radius } from '@/theme';

/** Sign in with Apple is in this build only when app.config.ts turned the capability on. */
const appleSignInBuilt = Platform.OS === 'ios' && Constants.expoConfig?.ios?.usesAppleSignIn === true;

const BUTTON_HEIGHT = 52;

type Props = {
  /** Called with the API session once the provider and runmeal-api both accept the person. */
  onSignedIn: (auth: AuthResponse) => Promise<void> | void;
  onError: (error: unknown) => void;
  busy?: boolean;
};

/**
 * Sign in with Apple (iOS) and Google above the email form, with an "or use
 * your email" divider when either is shown. Each is switched on per brand in
 * brand/brand.json `signIn`.
 */
export function SocialSignIn({ onSignedIn, onError, busy }: Props) {
  const { t } = useTranslation();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const google = BRAND.signIn.google;

  useEffect(() => {
    if (!appleSignInBuilt) return;
    let cancelled = false;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => !cancelled && setAppleAvailable(ok))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!appleAvailable && !google) return null;

  /**
   * The raw nonce goes to the API and its SHA-256 hex digest to Apple, which
   * signs it into the identity token; the API checks that they match. Apple
   * shares the name only on the first sign-in.
   */
  const signInWithApple = async () => {
    if (busy) return;
    try {
      const nonce = Crypto.randomUUID();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
      });
      if (!credential.identityToken || !credential.authorizationCode) throw new Error('APPLE_CREDENTIAL_INCOMPLETE');
      const firstName = credential.fullName?.givenName?.trim();
      const lastName = credential.fullName?.familyName?.trim();
      const auth = await loginWithApple({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        nonce,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      });
      await onSignedIn(auth);
    } catch (error) {
      // Closing Apple's sheet is the person's choice, not an error.
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      onError(error);
    }
  };

  // Mock until runmeal-api has POST /auth/google/native (docs/BACKEND_REQUEST_SOCIAL_SIGN_IN.md).
  const signInWithGoogle = () => Alert.alert(t('auth.googleSoonTitle'), t('auth.googleSoonBody'));

  return (
    <View style={styles.wrap}>
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.lg}
          style={styles.apple}
          onPress={signInWithApple}
        />
      ) : null}
      {google ? (
        // Google's branding: white button, outline, the four-colour G and "Sign in with Google".
        <Pressable
          onPress={signInWithGoogle}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.google, pressed && styles.googlePressed]}
        >
          <GoogleLogo />
          <Text style={styles.googleText}>{t('auth.signInWithGoogle')}</Text>
        </Pressable>
      ) : null}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>{t('auth.orEmail')}</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

/** Google's "G" mark, from Google's sign-in branding assets. */
function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  apple: { width: '100%', height: BUTTON_HEIGHT },
  google: {
    height: BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
  },
  googlePressed: { backgroundColor: colors.zinc50 },
  googleText: { fontSize: 19, fontWeight: '500', color: '#1F1F1F' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.zinc200 },
  dividerText: { fontSize: font.small, color: colors.zinc500 },
});
