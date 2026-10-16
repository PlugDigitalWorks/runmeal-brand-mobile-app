import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, font, radius, shadow } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  style?: ViewStyle;
  trailing?: string;
};

/** brandfe's CTA: primary fill with an orange glow, or the zinc outline secondary. */
export function Button({ label, onPress, variant = 'primary', loading, style, trailing }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.outline,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.primaryForeground : colors.primary} />
      ) : (
        <Text style={[styles.label, { color: primary ? colors.primaryForeground : colors.zinc700 }]}>
          {label}
          {trailing ? `  ·  ${trailing}` : ''}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.primary, ...shadow.raised },
  outline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.zinc200 },
  label: { fontSize: font.base, fontWeight: '700' },
});
