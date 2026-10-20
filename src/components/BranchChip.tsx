import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, MapPin, QrCode } from 'lucide-react-native';
import { useStorefront } from '@/context/StorefrontContext';
import { useTable } from '@/context/TableContext';
import { formatDistance } from '@/lib/branches';
import { colors, font, radius } from '@/theme';

/**
 * "📍 Richmond · 0.8 km ▾" opens the branch sheet. At a scanned table the branch
 * is the table's, so it reads "Richmond · Table 1" and offers to leave the table.
 */
export function BranchChip() {
  const { t } = useTranslation();
  const { branch, branches } = useStorefront();
  const { journey, endJourney } = useTable();
  const atTable = !!journey && !!branch && journey.branchId === branch.id;
  const distance = branches.find((r) => r.branch.id === branch?.id)?.distanceM;

  const label = !branch
    ? t('branch.choose')
    : atTable
      ? t('table.chip', { branch: branch.name, table: journey.tableLabel })
      : `${branch.name}${distance != null ? `  ·  ${formatDistance(distance)}` : ''}`;

  const onPress = () => {
    if (!atTable) return router.push('/branches');
    Alert.alert(label, t('table.atTable', { branch: branch.name, table: journey.tableLabel }), [
      { text: t('table.stay'), style: 'cancel' },
      { text: t('table.leave'), style: 'destructive', onPress: () => endJourney() },
    ]);
  };

  return (
    <Pressable style={styles.chip} onPress={onPress} accessibilityRole="button">
      {atTable ? <QrCode size={14} color={colors.primary} /> : <MapPin size={14} color={colors.primary} />}
      <Text style={styles.label} numberOfLines={1}>
        {label}
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
