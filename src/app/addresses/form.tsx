import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LocateFixed, X } from 'lucide-react-native';
import { useBrand } from '@/context/BrandContext';
import { apiErrorMessage } from '@/lib/api-error';
import { addressFirstLine, normalizePhone } from '@/lib/address';
import { createAddress, getAddresses, updateAddress } from '@/services/order.service';
import { Button } from '@/ui/Button';
import { colors, font, radius, space } from '@/theme';
import type { Address } from '@/types/order';

type Region = { countryCode: string; province: string; district: string };
type Point = { latitude: number; longitude: number };

/** The cafe's market when the phone gives no country: brands price in their home currency. */
const COUNTRY_BY_CURRENCY: Record<string, string> = { GBP: 'GB', TRY: 'TR', EUR: 'DE', USD: 'US' };
/** Where the house number comes before the street, as brandfe's composeFirstLine. */
const NUMBER_FIRST = new Set(['GB', 'US', 'CA', 'AU', 'NZ', 'IE']);

function composeFirstLine(street: string, number: string, country: string): string {
  if (!number) return street;
  if (!street) return number;
  if (NUMBER_FIRST.has(country)) return `${number} ${street}`;
  if (country === 'TR') return `${street} No: ${number}`;
  return `${street} ${number}`;
}

const longEnough = (value?: string | null) => (value && value.trim().length >= 2 ? value.trim() : null);

/** City and area for the API, which still requires them, from the phone's reverse geocoding. */
function regionFrom(place: Location.LocationGeocodedAddress | undefined, fallbackCountry: string): Region | null {
  if (!place) return null;
  const province = longEnough(place.region) ?? longEnough(place.subregion) ?? longEnough(place.city);
  const district = longEnough(place.city) ?? longEnough(place.district) ?? longEnough(place.subregion) ?? province;
  if (!province || !district) return null;
  return { countryCode: place.isoCountryCode ?? fallbackCountry, province, district };
}

/**
 * brandfe's AddressForm without the map: the first line, postcode and phone. The
 * API's coordinates, city and area come from the phone's location or from
 * geocoding what the customer typed. Adds an address, or edits one with `id`.
 */
export default function AddressFormScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { brand } = useBrand();
  const fallbackCountry = COUNTRY_BY_CURRENCY[brand?.currency ?? ''] ?? 'GB';

  const [line, setLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  // Kept only while they still describe what is typed; any edit sends the address to geocoding again.
  const [located, setLocated] = useState<{ point: Point; region: Region } | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getAddresses()
      .then((all) => {
        const address: Address | undefined = all.find((a) => a.id === id);
        if (cancelled || !address) return;
        setLine(addressFirstLine(address));
        setPostalCode(address.postalCode ?? '');
        setPhone(address.phoneE164 ?? '');
        setLocated({
          point: { latitude: address.latitude, longitude: address.longitude },
          region: { countryCode: address.countryCode, province: address.province, district: address.district },
        });
      })
      .catch(() => !cancelled && setError(t('address.loadFailed')))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const edit = (setter: (value: string) => void) => (value: string) => {
    setError(null);
    setLocated(null);
    setter(value);
  };

  const useMyLocation = async () => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setError(t('address.locationNeeded'));
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const [place] = await Location.reverseGeocodeAsync(point);
      const region = regionFrom(place, fallbackCountry);
      if (!place || !region) return setError(t('address.locationNeeded'));
      setLine(composeFirstLine(place.street ?? '', place.streetNumber ?? '', region.countryCode));
      setPostalCode(place.postalCode ?? '');
      setLocated({ point, region });
    } catch {
      setError(t('address.locationNeeded'));
    }
  };

  /** Coordinates and region for what is typed: from location or the address it was loaded with, else geocoding. */
  const locate = async (): Promise<{ point: Point; region: Region } | null> => {
    if (located) return located;
    const [match] = await Location.geocodeAsync(`${line.trim()}, ${postalCode.trim()}`);
    if (!match) return null;
    const point = { latitude: match.latitude, longitude: match.longitude };
    const [place] = await Location.reverseGeocodeAsync(point);
    const region = regionFrom(place, fallbackCountry);
    return region ? { point, region } : null;
  };

  const save = async () => {
    if (!longEnough(line) || !postalCode.trim()) return setError(t('address.required'));
    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) return setError(t('address.phoneInvalid'));
    setBusy(true);
    setError(null);
    try {
      const place = await locate().catch(() => null);
      if (!place) return setError(t('address.notFound'));
      const input = {
        countryCode: place.region.countryCode,
        province: place.region.province,
        district: place.region.district,
        street: line.trim(),
        postalCode: postalCode.trim(),
        phoneE164,
        latitude: place.point.latitude,
        longitude: place.point.longitude,
        // The whole first line is in `street`; null clears an older separate house or flat number.
        buildingNumber: null,
        apartmentNumber: null,
      };
      if (id) await updateAddress(id, input);
      else await createAddress({ ...input, isActive: true });
      router.back();
    } catch (e) {
      setError(apiErrorMessage(e, t('address.failed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Text style={styles.title}>{id ? t('address.editTitle') : t('address.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close">
            <X size={24} color={colors.zinc500} />
          </Pressable>
        </View>
        <Pressable style={styles.locate} onPress={useMyLocation} disabled={!loaded}>
          <LocateFixed size={18} color={colors.primary} />
          <Text style={styles.locateText}>{t('address.useLocation')}</Text>
        </Pressable>
        <Field label={t('address.firstLine')}>
          <TextInput
            testID="address-line"
            value={line}
            onChangeText={edit(setLine)}
            placeholder={t('address.firstLinePlaceholder')}
            placeholderTextColor={colors.zinc400}
            autoComplete="street-address"
            style={styles.input}
          />
        </Field>
        <Field label={t('address.postalCode')}>
          <TextInput
            testID="address-postcode"
            value={postalCode}
            onChangeText={edit(setPostalCode)}
            autoCapitalize="characters"
            autoComplete="postal-code"
            style={styles.input}
          />
        </Field>
        <Field label={t('address.phone')}>
          <TextInput
            testID="address-phone"
            value={phone}
            onChangeText={(value) => {
              setError(null);
              setPhone(value);
            }}
            placeholder="+44 7700 900123"
            placeholderTextColor={colors.zinc400}
            keyboardType="phone-pad"
            autoComplete="tel"
            style={styles.input}
          />
        </Field>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={t('address.save')} loading={busy || !loaded} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
