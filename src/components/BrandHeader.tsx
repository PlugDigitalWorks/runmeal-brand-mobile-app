import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandSwitcherButton } from '@/components/BrandSwitcherButton';
import { colors } from '@/theme';

/** White top bar like brandfe's sticky header: cafe logo, a middle slot and a right slot. */
export function BrandHeader({ center, right }: { center?: React.ReactNode; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <BrandSwitcherButton />
      <View style={styles.center}>{center}</View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.zinc200,
  },
  center: { flex: 1, minWidth: 0 },
});
