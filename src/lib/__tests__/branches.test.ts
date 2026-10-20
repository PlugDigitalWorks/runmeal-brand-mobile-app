import type { Branch } from '@/types/branch';
import { directionsUrl, distanceMeters, formatDistance, sortBranches } from '../branches';

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
  expect(formatDistance(850)).toBe('850 m');
  expect(formatDistance(1234)).toBe('1.2 km');
});

it('drops decimals and groups thousands for far-away branches', () => {
  expect(formatDistance(8_610_200)).toBe('8,610 km');
});

describe('directionsUrl', () => {
  const richmond = { ...branch('Richmond', -0.3061, 51.4597), addressText: 'George Street 3, Richmond' };

  it("opens Apple Maps on iOS and Google Maps on Android, to the branch's coordinates", () => {
    expect(directionsUrl(richmond, 'ios')).toBe('https://maps.apple.com/?daddr=51.4597%2C-0.3061&dirflg=d');
    expect(directionsUrl(richmond, 'android')).toBe('https://www.google.com/maps/dir/?api=1&destination=51.4597%2C-0.3061');
  });

  it('falls back to the address, and gives up without either', () => {
    const noPoint = { ...richmond, locationGeog: null };
    expect(directionsUrl(noPoint, 'android')).toBe('https://www.google.com/maps/dir/?api=1&destination=George%20Street%203%2C%20Richmond');
    expect(directionsUrl({ ...noPoint, addressText: '  ' }, 'ios')).toBeNull();
  });
});
