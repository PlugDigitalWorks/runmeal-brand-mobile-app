import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import BrandsScreen from '@/app/brands';
import { resolveBrandByHost } from '@/services/brand.service';

const mockSelectBrand = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();

const recentBrand = {
  brandId: 'r1',
  slug: 'acafe',
  name: 'A Cafe',
  logoUrl: null,
  currency: 'TRY',
  currencySymbol: '₺',
  primaryDomain: 'acafe.runmeal.com',
  defaultDomain: 'acafe.runmeal.com',
};
const resolvedB = { ...recentBrand, brandId: 'b1', slug: 'bcafe', name: 'B Cafe' };

jest.mock('@/services/brand.service', () => ({ resolveBrandByHost: jest.fn() }));
jest.mock('@/lib/brand-directory', () => ({
  ...jest.requireActual('@/lib/brand-directory'),
  BRAND_DIRECTORY: [
    { host: 'bcafe.runmeal.com', name: 'B Cafe' },
    { host: 'ccafe.runmeal.com', name: 'C Cafe' },
  ],
}));
jest.mock('expo-router', () => ({
  router: { replace: (p: string) => mockReplace(p) },
}));
jest.mock('@/context/BrandContext', () => ({
  useBrand: () => ({ brand: null, recent: [recentBrand], ready: true, selectBrand: mockSelectBrand }),
}));

beforeEach(() => jest.clearAllMocks());

it('shows recent cafes and the bundled directory', async () => {
  await render(<BrandsScreen />);
  expect(screen.getByText('A Cafe')).toBeTruthy();
  expect(screen.getByText('B Cafe')).toBeTruthy();
  expect(screen.getByText('C Cafe')).toBeTruthy();
});

it('filters the directory and hides recents while searching', async () => {
  await render(<BrandsScreen />);
  await fireEvent.changeText(screen.getByTestId('brand-search'), 'ccaf');
  expect(screen.queryByText('A Cafe')).toBeNull();
  expect(screen.queryByText('B Cafe')).toBeNull();
  expect(screen.getByText('C Cafe')).toBeTruthy();
});

it('resolves a directory cafe by host, selects it and opens its menu', async () => {
  (resolveBrandByHost as jest.Mock).mockResolvedValue(resolvedB);
  await render(<BrandsScreen />);

  await fireEvent.press(screen.getByText('B Cafe'));

  await waitFor(() => expect(mockSelectBrand).toHaveBeenCalledWith(resolvedB));
  expect(resolveBrandByHost).toHaveBeenCalledWith('bcafe.runmeal.com');
  expect(mockReplace).toHaveBeenCalledWith('/home');
});

it('selects a recent cafe without resolving again', async () => {
  await render(<BrandsScreen />);
  await fireEvent.press(screen.getByText('A Cafe'));
  await waitFor(() => expect(mockSelectBrand).toHaveBeenCalledWith(recentBrand));
  expect(resolveBrandByHost).not.toHaveBeenCalled();
});

it('shows an error when a cafe cannot be resolved', async () => {
  (resolveBrandByHost as jest.Mock).mockRejectedValue(new Error('404'));
  await render(<BrandsScreen />);
  await fireEvent.press(screen.getByText('C Cafe'));
  await waitFor(() =>
    expect(screen.getByText('Bu cafe şu an açılamıyor. Daha sonra tekrar dene.')).toBeTruthy(),
  );
  expect(mockSelectBrand).not.toHaveBeenCalled();
});
