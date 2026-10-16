import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppBrand } from '@/types/brand';
import { getBrandId, loadBrandState, pushRecent, saveActiveBrand } from '../brand-store';

const brand = (slug: string): AppBrand => ({
  brandId: `id-${slug}`,
  slug,
  name: slug,
  logoUrl: null,
  currency: 'TRY',
  currencySymbol: '₺',
  primaryDomain: `${slug}.runmeal.com`,
  defaultDomain: `${slug}.runmeal.com`,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('pushRecent', () => {
  it('puts the brand first, drops its older entry and caps the list', () => {
    const list = [brand('a'), brand('b'), brand('c')];
    expect(pushRecent(list, brand('b'), 3).map((b) => b.slug)).toEqual(['b', 'a', 'c']);
    expect(pushRecent(list, brand('d'), 3).map((b) => b.slug)).toEqual(['d', 'a', 'b']);
  });
});

describe('saveActiveBrand', () => {
  it('persists the active brand and exposes its id synchronously', async () => {
    await saveActiveBrand(brand('a'));
    expect(getBrandId()).toBe('id-a');

    const state = await loadBrandState();
    expect(state.active?.slug).toBe('a');
    expect(state.recent.map((b) => b.slug)).toEqual(['a']);
  });

  it('clears brand-scoped keys when the cafe changes', async () => {
    await saveActiveBrand(brand('a'));
    await AsyncStorage.setItem('brand-scoped:cart', 'x');
    await AsyncStorage.setItem('rm_device_id', 'keep');

    await saveActiveBrand(brand('b'));

    expect(await AsyncStorage.getItem('brand-scoped:cart')).toBeNull();
    expect(await AsyncStorage.getItem('rm_device_id')).toBe('keep');
  });

  it('keeps brand-scoped keys when the same cafe is re-selected', async () => {
    await saveActiveBrand(brand('a'));
    await AsyncStorage.setItem('brand-scoped:cart', 'x');

    await saveActiveBrand(brand('a'));

    expect(await AsyncStorage.getItem('brand-scoped:cart')).toBe('x');
  });
});
