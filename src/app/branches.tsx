import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, LocateFixed, MapPin, Navigation } from 'lucide-react-native';
import { useStorefront } from '@/context/StorefrontContext';
import { directionsUrl, formatDistance } from '@/lib/branches';
import { canAskForLocation } from '@/lib/location';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';
import type { Branch } from '@/types/branch';

/** Branch picker sheet, styled after brandfe's BranchSelector cards. */
export default function BranchesSheet() {
  const { t } = useTranslation();
  const { branches, branch: selected, selectBranch, location, locate, branchStatus, reload } = useStorefront();

  // The system prompt while it can still show; after a "Don't allow", only Settings can turn it on.
  const turnOnLocation = async () => {
    if (await canAskForLocation()) {
      if (await locate()) return;
    }
    Linking.openSettings();
  };

  const choose = async (branch: Branch) => {
    await selectBranch(branch);
    router.back();
  };

  return (
    <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('branch.title')}</Text>
      {!location && branches.length ? (
        <Pressable style={styles.locationCard} onPress={turnOnLocation} accessibilityRole="button">
          <LocateFixed size={18} color={colors.primary} />
          <Text style={styles.locationText}>{t('branch.locationOff')}</Text>
          <Text style={styles.locationAction}>{t('branch.turnOnLocation')}</Text>
        </Pressable>
      ) : null}
      {branchStatus === 'error' ? (
        <>
          <Text style={styles.hint}>{t('branch.error')}</Text>
          <Button label={t('retry')} variant="outline" onPress={reload} />
        </>
      ) : (
        branches.map(({ branch, distanceM }) => {
          const on = branch.id === selected?.id;
          const types = branch.order_type_settings;
          const chips = [
            types?.pickup?.isActive && t('branch.pickup'),
            types?.tableOrder?.isActive && t('branch.table'),
            types?.delivery?.isActive && t('branch.delivery'),
          ].filter(Boolean) as string[];
          const directions = directionsUrl(branch, Platform.OS === 'ios' ? 'ios' : 'android');
          return (
            <Pressable
              key={branch.id}
              onPress={() => choose(branch)}
              style={[styles.card, on ? styles.cardOn : styles.cardOff]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{branch.name}</Text>
                  {on ? <Check size={16} color={colors.primary} /> : null}
                </View>
                {branch.addressText ? (
                  <Text style={styles.address} numberOfLines={1}>
                    {branch.addressText}
                  </Text>
                ) : null}
                {distanceM != null ? (
                  <View style={styles.distanceRow}>
                    <MapPin size={12} color={colors.primary} />
                    <Text style={styles.distance}>{formatDistance(distanceM)}</Text>
                  </View>
                ) : null}
                {chips.length ? (
                  <View style={styles.chips}>
                    {chips.map((label) => (
                      <Text key={label} style={styles.chip}>
                        {label}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
              {directions ? (
                <Pressable
                  onPress={() => Linking.openURL(directions)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.directions, pressed && { opacity: 0.7 }]}
                  accessibilityRole="link"
                  accessibilityLabel={t('branch.directionsTo', { name: branch.name })}
                >
                  <Navigation size={18} color={colors.primary} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.xl, paddingTop: space.xxl + 4, gap: 12, paddingBottom: 40 },
  title: { fontSize: font.heading, fontWeight: '800', color: colors.zinc900 },
  hint: { fontSize: font.body, color: colors.zinc500 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  locationText: { flex: 1, fontSize: font.small + 1, color: colors.zinc700, lineHeight: 18 },
  locationAction: { fontSize: font.small + 1, fontWeight: '700', color: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.orange50 },
  cardOff: { borderColor: colors.zinc200, backgroundColor: colors.card },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: font.base, fontWeight: '700', color: colors.zinc800 },
  directions: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  address: { fontSize: font.small, color: colors.zinc400 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distance: { fontSize: font.small, fontWeight: '600', color: '#f97316' },
  chips: { flexDirection: 'row', gap: 6, marginTop: 4 },
  chip: {
    fontSize: font.caption,
    fontWeight: '600',
    color: colors.zinc600,
    backgroundColor: colors.zinc50,
    borderWidth: 1,
    borderColor: colors.zinc200,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
