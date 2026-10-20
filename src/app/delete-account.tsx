import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TriangleAlert, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/lib/api-error';
import { deleteAccount } from '@/services/auth.service';
import { colors, font, radius, space } from '@/theme';

/**
 * App Store guideline 5.1.1(v) and Google Play's account deletion policy: an
 * account made in the app can be deleted in the app. Asks once more, then
 * deletes it on the API and signs out here.
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A second tap mid-request would send a second delete.
  const inFlight = useRef(false);

  const remove = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (e) {
      setError(apiErrorMessage(e, t('deleteAccount.failed')));
      inFlight.current = false;
      setBusy(false);
      return;
    }
    await signOut();
    router.back();
    Alert.alert(t('deleteAccount.doneTitle'), t('deleteAccount.doneBody'));
  };

  const confirm = () =>
    Alert.alert(t('deleteAccount.confirmTitle'), t('deleteAccount.confirmBody'), [
      { text: t('address.cancel'), style: 'cancel' },
      { text: t('deleteAccount.confirm'), style: 'destructive', onPress: remove },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t('deleteAccount.title')}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('common.close')}>
          <X size={24} color={colors.zinc500} />
        </Pressable>
      </View>
      <View style={styles.warning}>
        <TriangleAlert size={20} color={colors.destructive} />
        <Text style={styles.warningText}>{t('deleteAccount.warning')}</Text>
      </View>
      {user?.email ? <Text style={styles.body}>{t('deleteAccount.account', { email: user.email })}</Text> : null}
      <Text style={styles.heading}>{t('deleteAccount.whatHappens')}</Text>
      {(['profile', 'loyalty', 'signIn', 'orders'] as const).map((key) => (
        <View key={key} style={styles.bullet}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.body}>{t(`deleteAccount.points.${key}`)}</Text>
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        testID="delete-account"
        onPress={confirm}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ busy }}
        style={({ pressed }) => [styles.danger, (pressed || busy) && { opacity: 0.8 }]}
      >
        <Text style={styles.dangerText}>{busy ? t('deleteAccount.deleting') : t('deleteAccount.button')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  content: { padding: space.xl, gap: space.md },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.heading + 2, fontWeight: '800', color: colors.zinc900 },
  warning: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: '#FEF2F2',
  },
  warningText: { flex: 1, color: colors.destructive, fontSize: font.body, lineHeight: 20, fontWeight: '600' },
  heading: { fontSize: font.base, fontWeight: '700', color: colors.zinc900, marginTop: 4 },
  bullet: { flexDirection: 'row', gap: 8 },
  dot: { color: colors.zinc500, fontSize: font.body, lineHeight: 20 },
  body: { flex: 1, color: colors.zinc600, fontSize: font.body, lineHeight: 20 },
  error: { color: colors.destructive, fontSize: font.body },
  danger: {
    height: 52,
    marginTop: 8,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.destructive,
  },
  dangerText: { color: '#FFFFFF', fontSize: font.base, fontWeight: '700' },
});
