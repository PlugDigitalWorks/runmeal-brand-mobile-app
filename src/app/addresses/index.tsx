import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, MapPin, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { apiErrorMessage } from '@/lib/api-error';
import { addressFirstLine, addressSecondLine } from '@/lib/address';
import { deleteAddress, getAddresses, setActiveAddress } from '@/services/order.service';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, font, radius, space } from '@/theme';
import type { Address } from '@/types/order';

/** brandfe's profile → addresses: the delivery addresses, the default one ticked. */
export default function AddressesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One change at a time: a second tap mid-request would race the first.
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      setAddresses(await getAddresses());
      setFailed(false);
    } catch {
      // Keep what is on screen; a failed refresh must not read as "no addresses".
      setFailed(true);
      setAddresses((current) => current ?? []);
    }
  }, []);

  // The form is a modal, so the list reloads when it closes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const run = async (action: () => Promise<void>, fallback: string) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(apiErrorMessage(e, fallback));
    } finally {
      busy.current = false;
    }
  };

  const makeDefault = (address: Address) => {
    if (address.isActive) return;
    run(() => setActiveAddress(address.id), t('address.failed'));
  };

  const confirmDelete = (address: Address) =>
    Alert.alert(t('address.deleteTitle'), addressFirstLine(address), [
      { text: t('address.cancel'), style: 'cancel' },
      { text: t('address.delete'), style: 'destructive', onPress: () => run(() => deleteAddress(address.id), t('address.deleteFailed')) },
    ]);

  const add = () => router.push('/addresses/form');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('common.back')}>
          <ChevronLeft size={26} color={colors.zinc800} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('address.listTitle')}</Text>
        <Pressable onPress={add} hitSlop={10} accessibilityLabel={t('address.add')}>
          <Plus size={24} color={colors.primary} />
        </Pressable>
      </View>
      {addresses === null ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            error || (failed && addresses.length) ? <Text style={styles.error}>{error ?? t('address.loadFailed')}</Text> : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon={<MapPin size={32} color={colors.zinc300} />}
              title={failed ? t('address.loadFailed') : t('address.empty')}
              body={failed ? undefined : t('address.emptyBody')}
              action={
                failed ? (
                  <Button label={t('retry')} variant="outline" onPress={refresh} />
                ) : (
                  <Button label={t('address.add')} onPress={add} />
                )
              }
            />
          }
          ListFooterComponent={
            addresses.length ? (
              <Pressable style={styles.addRow} onPress={add}>
                <Plus size={16} color={colors.primary} />
                <Text style={styles.addText}>{t('address.add')}</Text>
              </Pressable>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`address-${item.id}`}
              style={({ pressed }) => [styles.row, item.isActive && styles.rowActive, pressed && { opacity: 0.9 }]}
              onPress={() => makeDefault(item)}
              accessibilityRole="radio"
              accessibilityState={{ selected: item.isActive }}
            >
              <View style={[styles.radio, item.isActive && styles.radioOn]}>
                {item.isActive ? <Check size={14} color={colors.primaryForeground} strokeWidth={3} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.line} numberOfLines={2}>
                  {item.title ? `${item.title} · ` : ''}
                  {addressFirstLine(item)}
                </Text>
                <Text style={styles.detail}>{addressSecondLine(item)}</Text>
                {item.isActive ? <Text style={styles.default}>{t('address.default')}</Text> : null}
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/addresses/form', params: { id: item.id } })}
                hitSlop={8}
                accessibilityLabel={t('address.edit')}
                style={styles.icon}
              >
                <Pencil size={18} color={colors.zinc500} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8} accessibilityLabel={t('address.delete')} style={styles.icon}>
                <Trash2 size={18} color={colors.destructive} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.zinc200,
  },
  headerTitle: { fontSize: font.title, fontWeight: '800', color: colors.zinc900 },
  list: { padding: space.lg, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: { borderColor: colors.primary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.zinc300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  line: { fontSize: font.base, fontWeight: '700', color: colors.zinc900 },
  detail: { fontSize: font.body, color: colors.zinc500 },
  default: { fontSize: font.small, fontWeight: '700', color: colors.primary, marginTop: 2 },
  icon: { padding: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  addText: { color: colors.primary, fontWeight: '700', fontSize: font.base },
  error: { color: colors.destructive, fontSize: font.body, textAlign: 'center' },
});
