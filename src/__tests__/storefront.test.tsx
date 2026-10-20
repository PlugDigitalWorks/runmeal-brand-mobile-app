import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { StorefrontProvider, useStorefront } from '@/context/StorefrontContext';
import { getUserLocation } from '@/lib/location';
import { listBrandBranches } from '@/services/branch.service';
import { getMenu } from '@/services/menu.service';
import type { Branch } from '@/types/branch';

const mockBrand = { brand: { brandId: 'b1' } };
jest.mock('@/context/BrandContext', () => ({ useBrand: () => mockBrand }));
jest.mock('@/lib/location', () => ({ getUserLocation: jest.fn(), canAskForLocation: jest.fn() }));
jest.mock('@/services/branch.service', () => ({ listBrandBranches: jest.fn() }));
jest.mock('@/services/menu.service', () => ({ getMenu: jest.fn() }));

const branch = (id: string, name: string, lng: number, lat: number): Branch => ({
  id,
  name,
  slug: id,
  addressText: null,
  logoUrl: null,
  bannerUrls: null,
  locationGeog: { type: 'Point', coordinates: [lng, lat] },
  currency: 'GBP',
  currencySymbol: '£',
  distanceM: null,
});
// The API sends Twickenham first; by name Richmond leads, by distance from nearTwickenham Twickenham does.
const richmond = branch('r', 'Richmond', -0.3015, 51.4613);
const twickenham = branch('t', 'Twickenham', -0.3247, 51.4474);
const nearTwickenham = { latitude: 51.4479, longitude: -0.3251 };

type Value = ReturnType<typeof useStorefront>;
let store: Value;
const capture = (v: Value) => {
  store = v;
};
function Probe({ onRender }: { onRender: (v: Value) => void }) {
  onRender(useStorefront());
  return null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (getMenu as jest.Mock).mockResolvedValue({ categories: [] });
  (listBrandBranches as jest.Mock).mockResolvedValue([twickenham, richmond]);
});

it('without location lists branches by name and picks the first one', async () => {
  (getUserLocation as jest.Mock).mockResolvedValue(null);
  await render(<StorefrontProvider><Probe onRender={capture} /></StorefrontProvider>);
  await waitFor(() => expect(store.branchStatus).toBe('ready'));
  expect(store.branches.map((r) => r.branch.name)).toEqual(['Richmond', 'Twickenham']);
  expect(store.branch?.name).toBe('Richmond');
});

it('loads the branches even when the first request fails', async () => {
  (getUserLocation as jest.Mock).mockResolvedValue(null);
  (listBrandBranches as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([twickenham, richmond]);
  await render(<StorefrontProvider><Probe onRender={capture} /></StorefrontProvider>);
  await waitFor(() => expect(store.branchStatus).toBe('ready'), { timeout: 3000 });
  expect(listBrandBranches).toHaveBeenCalledTimes(2);
  expect(store.branch?.name).toBe('Richmond');
});

it('moves to the nearest branch once location is turned on, unless the customer chose one', async () => {
  (getUserLocation as jest.Mock).mockResolvedValueOnce(null).mockResolvedValue(nearTwickenham);
  await render(<StorefrontProvider><Probe onRender={capture} /></StorefrontProvider>);
  await waitFor(() => expect(store.branch?.name).toBe('Richmond'));
  await act(async () => {
    await expect(store.locate()).resolves.toBe(true);
  });
  expect(store.branches[0].branch.name).toBe('Twickenham');
  expect(store.branch?.name).toBe('Twickenham');
});

it('keeps a branch the customer picked when location arrives', async () => {
  (getUserLocation as jest.Mock).mockResolvedValueOnce(null).mockResolvedValue(nearTwickenham);
  await render(<StorefrontProvider><Probe onRender={capture} /></StorefrontProvider>);
  await waitFor(() => expect(store.branchStatus).toBe('ready'));
  await act(() => store.selectBranch(richmond));
  await act(async () => {
    await store.locate();
  });
  expect(store.branches[0].branch.name).toBe('Twickenham');
  expect(store.branch?.name).toBe('Richmond');
});
