import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import '@/i18n';
import AddressesScreen from '@/app/addresses';
import AddressFormScreen from '@/app/addresses/form';
import { createAddress, deleteAddress, getAddresses, setActiveAddress, updateAddress } from '@/services/order.service';
import type { Address } from '@/types/order';

const mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(fn, [fn]);
  },
}));
const mockBrand = { brand: { brandId: 'b1', currency: 'GBP' } };
jest.mock('@/context/BrandContext', () => ({ useBrand: () => mockBrand }));
jest.mock('@/services/order.service', () => ({
  getAddresses: jest.fn(),
  createAddress: jest.fn(),
  updateAddress: jest.fn(),
  deleteAddress: jest.fn(),
  setActiveAddress: jest.fn(),
}));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const address = (over: Partial<Address>): Address =>
  ({
    id: 'a1',
    countryCode: 'GB',
    province: 'London',
    district: 'Richmond',
    street: '12 Hill Rise',
    buildingNumber: null,
    apartmentNumber: null,
    postalCode: 'TW10 6UA',
    phoneE164: '+447700900123',
    latitude: 51.46,
    longitude: -0.3,
    isActive: false,
    ...over,
  }) as Address;

beforeEach(() => {
  jest.clearAllMocks();
  delete mockParams.id;
  (Location.geocodeAsync as jest.Mock).mockResolvedValue([{ latitude: 51.5, longitude: -0.1 }]);
  (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ region: 'London', city: 'Richmond', isoCountryCode: 'GB' }]);
});

describe('my addresses', () => {
  it('ticks the default and makes another one the default on tap', async () => {
    (getAddresses as jest.Mock).mockResolvedValue([address({ id: 'a1', isActive: true }), address({ id: 'a2', street: '3 Kew Road' })]);
    (setActiveAddress as jest.Mock).mockResolvedValue(undefined);
    await render(<AddressesScreen />);
    expect(await screen.findByText('12 Hill Rise')).toBeTruthy();
    expect(screen.getAllByText('Richmond, London TW10 6UA')).toHaveLength(2);
    expect(screen.getAllByText('Default')).toHaveLength(1);

    await fireEvent.press(screen.getByTestId('address-a1'));
    expect(setActiveAddress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('address-a2'));
    await waitFor(() => expect(setActiveAddress).toHaveBeenCalledWith('a2'));
    expect(getAddresses).toHaveBeenCalledTimes(2);
  });

  it('deletes only after the customer confirms', async () => {
    (getAddresses as jest.Mock).mockResolvedValue([address({ id: 'a1' })]);
    (deleteAddress as jest.Mock).mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<AddressesScreen />);
    await fireEvent.press(await screen.findByLabelText('Delete'));
    expect(deleteAddress).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2]!;
    buttons.find((b) => b.style === 'destructive')!.onPress!();
    await waitFor(() => expect(deleteAddress).toHaveBeenCalledWith('a1'));
  });

  it('invites the first address when there are none', async () => {
    (getAddresses as jest.Mock).mockResolvedValue([]);
    await render(<AddressesScreen />);
    expect(await screen.findByText('No addresses yet')).toBeTruthy();
  });
});

describe('address form', () => {
  const fill = async (line: string, postcode: string, phone: string) => {
    await fireEvent.changeText(screen.getByTestId('address-line'), line);
    await fireEvent.changeText(screen.getByTestId('address-postcode'), postcode);
    await fireEvent.changeText(screen.getByTestId('address-phone'), phone);
  };

  it('needs a phone with its country code', async () => {
    await render(<AddressFormScreen />);
    await fill('12 Hill Rise', 'TW10 6UA', '07700 900123');
    await fireEvent.press(screen.getByText('Save address'));
    expect(await screen.findByText(/country code/)).toBeTruthy();
    expect(createAddress).not.toHaveBeenCalled();
  });

  it('adds the whole first line as the street, geocoded, as the default', async () => {
    (createAddress as jest.Mock).mockResolvedValue(address({}));
    await render(<AddressFormScreen />);
    await fill('12 Hill Rise, Flat 2', 'TW10 6UA', '+44 7700 900123');
    await fireEvent.press(screen.getByText('Save address'));
    await waitFor(() => expect(createAddress).toHaveBeenCalled());
    expect(Location.geocodeAsync).toHaveBeenCalledWith('12 Hill Rise, Flat 2, TW10 6UA');
    expect(createAddress).toHaveBeenCalledWith({
      countryCode: 'GB',
      province: 'London',
      district: 'Richmond',
      street: '12 Hill Rise, Flat 2',
      postalCode: 'TW10 6UA',
      phoneE164: '+447700900123',
      latitude: 51.5,
      longitude: -0.1,
      buildingNumber: null,
      apartmentNumber: null,
      isActive: true,
    });
  });

  it('edits an address in place, keeping its coordinates when only the phone changes', async () => {
    mockParams.id = 'a1';
    (getAddresses as jest.Mock).mockResolvedValue([address({ id: 'a1', street: 'Hill Rise', buildingNumber: '12', apartmentNumber: '2' })]);
    (updateAddress as jest.Mock).mockResolvedValue(address({}));
    await render(<AddressFormScreen />);
    await waitFor(() => expect(screen.getByTestId('address-line').props.value).toBe('Hill Rise, 12 / 2'));
    await fireEvent.changeText(screen.getByTestId('address-phone'), '+44 7700 900999');
    await fireEvent.press(screen.getByText('Save address'));
    await waitFor(() => expect(updateAddress).toHaveBeenCalled());
    expect(Location.geocodeAsync).not.toHaveBeenCalled();
    expect(updateAddress).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ street: 'Hill Rise, 12 / 2', phoneE164: '+447700900999', latitude: 51.46, buildingNumber: null }),
    );
    expect(createAddress).not.toHaveBeenCalled();
  });
});
