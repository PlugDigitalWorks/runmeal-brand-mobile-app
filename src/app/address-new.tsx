import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LocateFixed, X } from 'lucide-react-native';
import { useBrand } from '@/context/BrandContext';
import { apiErrorMessage } from '@/lib/api-error';
import { createAddress } from '@/services/order.service';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';

type Form = {
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
};

const EMPTY: Form = { street: '', buildingNumber: '', apartmentNumber: '', district: '', province: '', postalCode: '', phone: '' };

/** The cafe's market when the phone gives no country: brands price in their home currency. */
const COUNTRY_BY_CURRENCY: Record<string, string> = { GBP: 'GB', TRY: 'TR', EUR: 'DE', USD: 'US' };

/**
 * brandfe's AddressForm without the map: the API needs coordinates, so they come
 * from the phone's location or from geocoding what the customer typed.
 */
export default function NewAddressScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();
  const [form, setForm] = useState<Form>(EMPTY);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [country, setCountry] = useState<string>(COUNTRY_BY_CURRENCY[brand?.currency ?? ''] ?? 'GB');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const useMyLocation = async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return setError(t('address.locationNeeded'));
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setCoords(here);
    const [place] = await Location.reverseGeocodeAsync(here);
    if (place) {
      setForm((current) => ({
        ...current,
        street: current.street || place.street || '',
        buildingNumber: current.buildingNumber || place.streetNumber || '',
        district: current.district || place.district || place.city || '',
        province: current.province || place.region || place.subregion || place.city || '',
        postalCode: current.postalCode || place.postalCode || '',
      }));
      if (place.isoCountryCode) setCountry(place.isoCountryCode);
    }
  };

  const save = async () => {
    const required = [form.street, form.buildingNumber, form.district, form.province, form.postalCode];
    if (required.some((value) => !value.trim())) return setError(t('address.required'));
    setBusy(true);
    setError(null);
    try {
      let point = coords;
      if (!point) {
        const [match] = await Location.geocodeAsync(
          `${form.street} ${form.buildingNumber}, ${form.district}, ${form.province} ${form.postalCode}`,
        );
        if (!match) {
          setError(t('address.locationNeeded'));
          return;
        }
        point = { latitude: match.latitude, longitude: match.longitude };
      }
      await createAddress({
        countryCode: country,
        street: form.street.trim(),
        buildingNumber: form.buildingNumber.trim(),
        apartmentNumber: form.apartmentNumber.trim(),
        district: form.district.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
        latitude: point.latitude,
        longitude: point.longitude,
        isActive: true,
        ...(form.phone.trim() ? { phoneE164: form.phone.replace(/[^\d+]/g, '') } : {}),
      });
      router.back();
    } catch (e) {
      setError(apiErrorMessage(e, t('address.failed')));
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof Form, label: string, extra?: Partial<React.ComponentProps<typeof TextInput>>) => (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={form[key]} onChangeText={set(key)} style={styles.input} placeholderTextColor={colors.zinc400} {...extra} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Text style={styles.title}>{t('address.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close">
            <X size={24} color={colors.zinc500} />
          </Pressable>
        </View>
        <Pressable style={styles.locate} onPress={useMyLocation}>
          <LocateFixed size={18} color={colors.primary} />
          <Text style={styles.locateText}>{t('address.useLocation')}</Text>
        </Pressable>
        {field('street', t('address.street'), { autoComplete: 'street-address' })}
        <View style={styles.row}>
          {field('buildingNumber', t('address.buildingNumber'))}
          {field('apartmentNumber', t('address.apartmentNumber'))}
        </View>
        {field('district', t('address.district'))}
        <View style={styles.row}>
          {field('province', t('address.province'))}
          {field('postalCode', t('address.postalCode'), { autoCapitalize: 'characters', autoComplete: 'postal-code' })}
        </View>
        {field('phone', t('address.phone'), { keyboardType: 'phone-pad', autoComplete: 'tel' })}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={t('address.save')} loading={busy} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  content: { padding: space.xl, gap: space.md },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.heading + 2, fontWeight: '800', color: colors.zinc900 },
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.orange50,
  },
  locateText: { color: colors.primary, fontWeight: '700', fontSize: font.body + 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: font.body, fontWeight: '600', color: colors.zinc700 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.zinc200,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    fontSize: font.base,
    color: colors.zinc900,
  },
  error: { color: colors.destructive, fontSize: font.body },
});
