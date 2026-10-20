import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { BrandProvider, useBrand } from '@/context/BrandContext';
import { cacheBrand } from '@/lib/brand-store';
import { resolveBrandByHost } from '@/services/brand.service';
import type { AppBrand } from '@/types/brand';

jest.mock('@/services/brand.service', () => ({ resolveBrandByHost: jest.fn() }));

const dharma: AppBrand = {
  brandId: 'b1',
  slug: 'dharma-coffee',
  name: 'Dharma Coffee',
  logoUrl: null,
  currency: 'GBP',
  currencySymbol: '£',
  primaryDomain: 'order.dharmacoffee.uk',
  defaultDomain: 'dharma-coffee.runmeal.com',
};

type Value = ReturnType<typeof useBrand>;
let value: Value;
const capture = (v: Value) => {
  value = v;
};
function Probe({ onRender }: { onRender: (v: Value) => void }) {
  onRender(useBrand());
  return null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

it("resolves the configured brand by its web host", async () => {
  (resolveBrandByHost as jest.Mock).mockResolvedValue(dharma);
  await render(<BrandProvider><Probe onRender={capture} /></BrandProvider>);
  await waitFor(() => expect(value.brand).toEqual(dharma));
  expect(resolveBrandByHost).toHaveBeenCalledWith('order.dharmacoffee.uk');
  expect(value.failed).toBe(false);
});

it('opens from the cached brand when the network is down', async () => {
  await cacheBrand(dharma);
  (resolveBrandByHost as jest.Mock).mockRejectedValue(new Error('offline'));
  await render(<BrandProvider><Probe onRender={capture} /></BrandProvider>);
  await waitFor(() => expect(value.brand).toEqual(dharma));
  expect(value.failed).toBe(false);
});

it('reports a failure with nothing cached, and retries', async () => {
  (resolveBrandByHost as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(dharma);
  await render(<BrandProvider><Probe onRender={capture} /></BrandProvider>);
  await waitFor(() => expect(value.failed).toBe(true));
  await act(async () => value.retry());
  await waitFor(() => expect(value.brand).toEqual(dharma));
  expect(value.failed).toBe(false);
});
