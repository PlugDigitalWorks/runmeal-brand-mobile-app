import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BellRing } from 'lucide-react-native';
import { useNotifications } from '@/context/NotificationsContext';
import { markPermissionAsked, registerForPush, requestPushPermission } from '@/lib/push';
import { Button } from '@/ui/Button';
import { colors, font, space } from '@/theme';

/**
 * The app's own reason for notifications, shown once after sign-in before the
 * system prompt. "Not now" is final: the app never asks again, and "My
 * notifications" explains how to turn them on in Settings.
 */
export default function NotificationsPermissionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refreshUnread } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allow = async () => {
    setBusy(true);
    setError(null);
    try {
      if ((await requestPushPermission()) === 'granted') {
        const result = await registerForPush();
        if (result === 'guest') return setError(t('common.apiErrors.PUSH_GUEST_NOT_ALLOWED'));
        refreshUnread();
      }
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const later = async () => {
    await markPermissionAsked();
    router.back();
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.icon}>
        <BellRing size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t('notifications.permission.title')}</Text>
      <Text style={styles.body}>{t('notifications.permission.body')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={t('notifications.permission.allow')} loading={busy} onPress={allow} style={{ alignSelf: 'stretch' }} />
      <Button label={t('notifications.permission.later')} variant="outline" onPress={later} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: space.xl, gap: space.md, alignItems: 'center', backgroundColor: colors.card },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.orange50, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.heading, fontWeight: '800', color: colors.zinc900, textAlign: 'center' },
  body: { fontSize: font.body + 1, lineHeight: 22, color: colors.zinc600, textAlign: 'center' },
  error: { color: colors.destructive, fontSize: font.body, textAlign: 'center' },
});
