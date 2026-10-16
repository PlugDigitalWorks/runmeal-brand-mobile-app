import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, font, radius } from '@/theme';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  style?: ViewStyle;
};

/** brandfe's category pill: primary fill when active, white with a zinc border otherwise. */
export function Chip({ label, active, onPress, icon, trailingIcon, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: active }}
      style={[styles.chip, active ? styles.active : styles.idle, style]}
    >
      {icon}
      <Text numberOfLines={1} style={[styles.label, { color: active ? colors.primaryForeground : colors.zinc700 }]}>
        {label}
      </Text>
      {trailingIcon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  idle: { backgroundColor: colors.card, borderColor: colors.zinc200 },
  label: { fontSize: font.body, fontWeight: '600' },
});
