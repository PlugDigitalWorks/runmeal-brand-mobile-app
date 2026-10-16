import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { useStorefront } from '@/context/StorefrontContext';
import { formatDistance } from '@/lib/branches';
import { colors, font, radius } from '@/theme';

/** "📍 Richmond · 0,8 km ▾" — opens the branch sheet. */
export function BranchChip() {
  const { t } = useTranslation();
  const { branch, branches } = useStorefront();
  const distance = branches.find((r) => r.branch.id === branch?.id)?.distanceM;

  return (
    <Pressable style={styles.chip} onPress={() => router.push('/branches')} accessibilityRole="button">
      <MapPin size={14} color={colors.primary} />
      <Text style={styles.label} numberOfLines={1}>
        {branch ? branch.name : t('branch.choose')}
        {branch && distance != null ? `  ·  ${formatDistance(distance)}` : ''}
      </Text>
      <ChevronDown size={14} color={colors.zinc500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.zinc200,
    backgroundColor: colors.card,
    maxWidth: '100%',
  },
  label: { fontSize: font.small + 1, fontWeight: '600', color: colors.zinc700, flexShrink: 1 },
});
