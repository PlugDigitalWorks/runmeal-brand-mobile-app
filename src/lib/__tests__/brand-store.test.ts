import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheBrand, getBrandId, loadCachedBrand } from '../brand-store';
import type { AppBrand } from '@/types/brand';

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

beforeEach(() => AsyncStorage.clear());

it('keeps the resolved brand for the next cold start', async () => {
  expect(await loadCachedBrand()).toBeNull();
  await cacheBrand(dharma);
  expect(getBrandId()).toBe('b1');
  expect(await loadCachedBrand()).toEqual(dharma);
});

it('ignores a corrupt cache', async () => {
  await AsyncStorage.setItem('rm_brand', '{oops');
  expect(await loadCachedBrand()).toBeNull();
});
