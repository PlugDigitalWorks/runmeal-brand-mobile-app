import type { Branch } from '@/types/branch';
import { distanceMeters, formatDistance, sortBranches } from '../branches';

const branch = (id: string, lng: number, lat: number): Branch => ({
  id,
  name: id,
  slug: id,
  addressText: null,
  logoUrl: null,
  bannerUrls: null,
  locationGeog: { type: 'Point', coordinates: [lng, lat] },
  currency: 'GBP',
  currencySymbol: '£',
  distanceM: null,
});

it('measures great-circle distance in meters', () => {
  expect(Math.round(distanceMeters({ latitude: 51.4597, longitude: -0.3061 }, { latitude: 51.4471, longitude: -0.3283 }))).toBeGreaterThan(1900);
});

it('sorts by distance from the user, else by name', () => {
  const near = branch('Twickenham', -0.3283, 51.4471);
  const far = branch('Aberdeen', -2.0943, 57.1497);
  const me = { latitude: 51.45, longitude: -0.33 };
  expect(sortBranches([far, near], me).map((b) => b.branch.id)).toEqual(['Twickenham', 'Aberdeen']);
  expect(sortBranches([near, far], null).map((b) => b.branch.id)).toEqual(['Aberdeen', 'Twickenham']);
  expect(sortBranches([near], null)[0].distanceM).toBeNull();
});

it('formats distances like brandfe', () => {
  expect(formatDistance(850, 'tr')).toBe('850 m');
  expect(formatDistance(1234, 'tr')).toBe('1,2 km');
  expect(formatDistance(1234, 'en')).toBe('1.2 km');
});

it('drops decimals and groups thousands for far-away branches', () => {
  expect(formatDistance(8_610_200, 'tr')).toBe('8.610 km');
  expect(formatDistance(8_610_200, 'en')).toBe('8,610 km');
});
