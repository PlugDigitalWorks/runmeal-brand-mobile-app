import type { DirectoryEntry } from '@/types/brand';
import { BRAND_DIRECTORY, DIRECTORY_HOSTS, searchDirectory } from '../brand-directory';

const entries: DirectoryEntry[] = [
  { host: 'zeytin.runmeal.com', name: 'Zeytin Ağacı' },
  { host: 'order.dharmacoffee.uk', name: 'Dharma Coffee' },
  { host: 'order.istanbulkahve.com', name: 'İstanbul Kahvecisi' },
];

it('returns every cafe sorted by name for an empty query', () => {
  expect(searchDirectory(entries, '  ').map((e) => e.name)).toEqual([
    'Dharma Coffee',
    'İstanbul Kahvecisi',
    'Zeytin Ağacı',
  ]);
});

it('matches names regardless of case and Turkish characters', () => {
  expect(searchDirectory(entries, 'istanbul').map((e) => e.name)).toEqual(['İstanbul Kahvecisi']);
  expect(searchDirectory(entries, 'agac').map((e) => e.name)).toEqual(['Zeytin Ağacı']);
  expect(searchDirectory(entries, 'DHAR').map((e) => e.name)).toEqual(['Dharma Coffee']);
});

it('matches the host too', () => {
  expect(searchDirectory(entries, 'dharmacoffee.uk').map((e) => e.name)).toEqual(['Dharma Coffee']);
});

it('ships lower-case hosts without scheme or path', () => {
  expect(BRAND_DIRECTORY.length).toBeGreaterThan(0);
  for (const host of DIRECTORY_HOSTS) {
    expect(host).toMatch(/^[a-z0-9.-]+$/);
  }
});
