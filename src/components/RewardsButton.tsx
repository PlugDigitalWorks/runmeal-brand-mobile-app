import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react-native';
import { colors } from '@/theme';

/** Header shortcut to the loyalty / member QR page (brandfe's Gift → /rewards). */
export function RewardsButton() {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push('/rewards')}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={t('rewards.title')}
      hitSlop={6}
    >
      <Gift size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orange50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
