import { api } from '@/lib/api';
import { resolveBrandByHost } from '../brand.service';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }));
const get = api.get as jest.Mock;

it('resolves a cafe by sending its host as Origin and Referer', async () => {
  const payload = {
    brandId: 'b1',
    slug: 'dharma-coffee',
    name: 'Dharma Coffee',
    logoUrl: null,
    currency: 'GBP',
    currencySymbol: '£',
    primaryDomain: 'order.dharmacoffee.uk',
    defaultDomain: 'dharma-coffee.runmeal.com',
  };
  get.mockResolvedValue({ data: { status: true, message: 'Success', data: payload } });

  await expect(resolveBrandByHost('order.dharmacoffee.uk')).resolves.toEqual(payload);
  expect(get).toHaveBeenCalledWith('/brands/resolve', {
    headers: {
      Origin: 'https://order.dharmacoffee.uk',
      Referer: 'https://order.dharmacoffee.uk/',
    },
  });
});
