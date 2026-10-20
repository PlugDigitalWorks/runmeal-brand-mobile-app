import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { loginWithApple } from '@/services/auth.service';
import type { AuthResponse } from '@/types/auth';
import { colors, font, radius } from '@/theme';

/** Sign in with Apple is in this build only when app.config.ts turned the capability on. */
const appleSignInBuilt = Platform.OS === 'ios' && Constants.expoConfig?.ios?.usesAppleSignIn === true;

type Props = {
  /** Called with the API session once Apple and runmeal-api both accept the person. */
  onSignedIn: (auth: AuthResponse) => Promise<void> | void;
  onError: (error: unknown) => void;
  busy?: boolean;
  /** Shown under the button, e.g. "or use your email". */
  dividerLabel: string;
};

/**
 * Apple's own button and sheet. The raw nonce goes to the API and its SHA-256
 * hex digest to Apple, which signs it into the identity token; the API checks
 * that they match. Apple shares the name only on the first sign-in.
 */
export function AppleSignInButton({ onSignedIn, onError, busy, dividerLabel }: Props) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!appleSignInBuilt) return;
    let cancelled = false;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => !cancelled && setAvailable(ok))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  const signIn = async () => {
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

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radius.lg}
        style={styles.button}
        onPress={signIn}
      />
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>{dividerLabel}</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  button: { width: '100%', height: 52 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.zinc200 },
  dividerText: { fontSize: font.small, color: colors.zinc500 },
});
