import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { Recaptcha } from '@/components/Recaptcha';
import { SocialSignIn } from '@/components/SocialSignIn';
import { BrandWordmark } from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { apiErrorMessage } from '@/lib/api-error';
import { loginWithPassword, registerWithOtp, requestOtpLogin, verifyOtp } from '@/services/auth.service';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';
import { BRAND } from '@brand';

type Step = 'email' | 'password' | 'captcha' | 'code' | 'register';
type CaptchaFor = 'otp' | 'password';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-in as on brandfe's /login: emailed one-time code by default, password as
 * an option, and sign-up confirmed by code. Production needs a reCAPTCHA token
 * for /auth/login, solved here in a WebView on the cafe's own host.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { next, reason } = useLocalSearchParams<{ next?: string; reason?: 'order' }>();
  const { brand } = useBrand();
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [captchaFor, setCaptchaFor] = useState<CaptchaFor>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const host = brand?.primaryDomain ?? brand?.defaultDomain ?? BRAND.host;
  const trimmedEmail = email.trim().toLowerCase();

  const finish = () => {
    if (next) router.replace(next as Href);
    else router.back();
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(apiErrorMessage(e, t('auth.failed')));
    } finally {
      setBusy(false);
    }
  };

  const toCaptcha = (target: CaptchaFor) => {
    if (!EMAIL.test(trimmedEmail)) return setError(t('auth.invalidEmail'));
    if (target === 'password' && !password) return setError(t('auth.passwordRequired'));
    setError(null);
    setCaptchaFor(target);
    setStep('captcha');
  };

  const onCaptcha = (token: string) =>
    run(async () => {
      if (captchaFor === 'otp') {
        await requestOtpLogin(trimmedEmail, token);
        setCode('');
        setStep('code');
      } else {
        await signIn(await loginWithPassword(trimmedEmail, password, token));
        finish();
      }
    }).finally(() => setStep((current) => (current === 'captcha' ? (captchaFor === 'otp' ? 'email' : 'password') : current)));

  const onVerify = () => {
    if (!/^\d{6}$/.test(code)) return setError(t('auth.codeInvalid'));
    return run(async () => {
      await signIn(await verifyOtp(trimmedEmail, code));
      finish();
    });
  };

  const onRegister = () => {
    if (!EMAIL.test(trimmedEmail)) return setError(t('auth.invalidEmail'));
    if (!firstName.trim() || !lastName.trim()) return setError(t('auth.nameRequired'));
    return run(async () => {
      await registerWithOtp({ email: trimmedEmail, firstName: firstName.trim(), lastName: lastName.trim() });
      setCode('');
      setStep('code');
    });
  };

  // The sign-in step needs no heading: the buttons say what they do.
  const title =
    step === 'code' ? t('auth.codeTitle') : step === 'register' ? t('auth.registerTitle') : step === 'captcha' ? t('auth.verifyHuman') : null;

  return (
    // A plain view, not a ScrollView: the sheet sizes itself to this content.
    // iOS already pads a fit-to-contents sheet for the home indicator.
    <View style={[styles.content, { paddingBottom: (Platform.OS === 'ios' ? 0 : insets.bottom) + space.lg }]}>
      <View style={styles.topBar}>
        <BrandWordmark height={30} />
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close">
          <X size={24} color={colors.zinc500} />
        </Pressable>
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}

      {step === 'email' || step === 'password' ? (
        <>
          {/* Why sign-in opened applies to every method, so it sits above them all. */}
          {step === 'email' && reason === 'order' ? <Text style={styles.body}>{t('auth.signInToOrder')}</Text> : null}
          {step === 'email' ? (
            <SocialSignIn
                busy={busy}
              onSignedIn={async (auth) => {
                setError(null);
                await signIn(auth);
                finish();
              }}
              onError={(e) => setError(apiErrorMessage(e, t('auth.socialFailed')))}
            />
          ) : null}
          {/* How the email sign-in works, right above the email field. */}
          <Text style={styles.note}>{step === 'email' ? t('auth.subtitle') : t('auth.stayed')}</Text>
          <Field label={t('auth.email')}>
            <TextInput
              testID="login-email"
              value={email}
              onChangeText={(value) => {
                setError(null);
                setEmail(value);
              }}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.zinc400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.input}
            />
          </Field>
          {step === 'password' ? (
            <Field label={t('auth.password')}>
              <TextInput
                testID="login-password"
                value={password}
                onChangeText={(value) => {
                  setError(null);
                  setPassword(value);
                }}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                style={styles.input}
              />
            </Field>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={step === 'email' ? t('auth.continue') : t('auth.signIn')}
            loading={busy}
            onPress={() => toCaptcha(step === 'email' ? 'otp' : 'password')}
          />
          <Link
            label={step === 'email' ? t('auth.usePassword') : t('auth.useCode')}
            onPress={() => setStep(step === 'email' ? 'password' : 'email')}
          />
          <Link label={t('auth.createAccount')} onPress={() => setStep('register')} />
        </>
      ) : null}

      {step === 'captcha' ? (
        <>
          <Text style={styles.body}>{t('auth.verifyHumanBody')}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Recaptcha host={host} onToken={onCaptcha} onExpired={() => setError(t('auth.failed'))} />
        </>
      ) : null}

      {step === 'code' ? (
        <>
          <Text style={styles.body}>{t('auth.codeBody', { email: trimmedEmail })}</Text>
          <TextInput
            testID="login-code"
            value={code}
            onChangeText={(value) => {
              setError(null);
              setCode(value.replace(/\D/g, '').slice(0, 6));
            }}
            placeholder={t('auth.code')}
            placeholderTextColor={colors.zinc400}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            style={[styles.input, styles.codeInput]}
            maxLength={6}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('auth.verify')} loading={busy} onPress={onVerify} />
          <Link label={t('auth.resend')} onPress={() => setStep('email')} />
        </>
      ) : null}

      {step === 'register' ? (
        <>
          <Field label={t('auth.firstName')}>
            <TextInput
              value={firstName}
              onChangeText={(value) => {
                setError(null);
                setFirstName(value);
              }}
              autoComplete="given-name"
              style={styles.input}
            />
          </Field>
          <Field label={t('auth.lastName')}>
            <TextInput
              value={lastName}
              onChangeText={(value) => {
                setError(null);
                setLastName(value);
              }}
              autoComplete="family-name"
              style={styles.input}
            />
          </Field>
          <Field label={t('auth.email')}>
            <TextInput
              value={email}
              onChangeText={(value) => {
                setError(null);
                setEmail(value);
              }}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.zinc400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
          </Field>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('auth.register')} loading={busy} onPress={onRegister} />
          <Link label={t('auth.haveAccount')} onPress={() => setStep('email')} />
        </>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ alignSelf: 'center' }}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  title: { fontSize: font.display, fontWeight: '800', color: colors.zinc900, letterSpacing: -0.5 },
  note: { fontSize: font.base - 1, color: colors.zinc500, lineHeight: 21 },
  body: { fontSize: font.base - 1, color: colors.zinc500, lineHeight: 21, marginTop: -8 },
  label: { fontSize: font.body, fontWeight: '600', color: colors.zinc700 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.zinc200,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    fontSize: font.base,
    color: colors.zinc900,
    backgroundColor: colors.card,
  },
  codeInput: { textAlign: 'center', fontSize: font.heading, letterSpacing: 8, fontWeight: '700' },
  error: { color: colors.destructive, fontSize: font.body },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.body },
});
