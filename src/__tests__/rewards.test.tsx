import { Linking, Platform } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import RewardsScreen from '@/app/rewards';
import { createAppleWalletLink, createGoogleWalletLink, getMemberQr, getStampCards, type StampCard } from '@/services/loyalty.service';

const mockAuth = { user: { id: 'u1', firstName: 'Gökhan', lastName: 'Çalışkan' } as object | null, isMember: true };
const mockBrand = { brand: { brandId: 'b1', name: 'Dharma Coffee', logoUrl: null } };

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/context/BrandContext', () => ({ useBrand: () => mockBrand }));
jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('@/services/loyalty.service', () => ({
  getMemberQr: jest.fn(),
  getStampCards: jest.fn(),
  createAppleWalletLink: jest.fn(),
  createGoogleWalletLink: jest.fn(),
}));

const coffee: StampCard = {
  campaignId: 'camp1',
  campaignName: 'Coffee Card',
  brandId: 'b1',
  category: { id: 'cat', name: 'Coffee' },
  stampThreshold: 9,
  campaignStatus: 'ACTIVE',
  stampCount: 0,
  remainingStamps: 9,
  status: 'COLLECTING',
  rewardExpiresAt: null,
};

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
const realOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.isMember = true;
  Platform.OS = realOS;
  (getMemberQr as jest.Mock).mockResolvedValue({ qrToken: 't', qrValue: 'https://dash/qr/t' });
  (getStampCards as jest.Mock).mockResolvedValue([coffee]);
});
afterAll(() => {
  Platform.OS = realOS;
});

it('draws the card like the Wallet pass', async () => {
  await render(<RewardsScreen />);
  expect(await screen.findByText('Coffee Card')).toBeTruthy();
  expect(screen.getByText('0 / 9')).toBeTruthy();
  expect(screen.getByText('9')).toBeTruthy();
  expect(screen.getByText('Gökhan Ç.')).toBeTruthy();
  expect(screen.getByText('Dharma Coffee')).toBeTruthy();
});

it('adds the card to Apple Wallet on iPhone', async () => {
  Platform.OS = 'ios';
  (createAppleWalletLink as jest.Mock).mockResolvedValue({ url: 'https://api.runmeal.com/apple-wallet/download/t.pkpass' });
  await render(<RewardsScreen />);
  await fireEvent.press(await screen.findByText('Add to Apple Wallet'));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://api.runmeal.com/apple-wallet/download/t.pkpass'));
  expect(createAppleWalletLink).toHaveBeenCalledWith('b1', 'camp1');
  expect(screen.queryByLabelText('Add to Google Wallet')).toBeNull();
});

it('adds the card to Google Wallet on Android', async () => {
  Platform.OS = 'android';
  (createGoogleWalletLink as jest.Mock).mockResolvedValue({ url: 'https://pay.google.com/gp/v/save/jwt' });
  await render(<RewardsScreen />);
  await fireEvent.press(await screen.findByLabelText('Add to Google Wallet'));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://pay.google.com/gp/v/save/jwt'));
  expect(createGoogleWalletLink).toHaveBeenCalledWith('b1', 'camp1');
  expect(screen.queryByText('Add to Apple Wallet')).toBeNull();
});

it('never opens a link that is not Google’s save page', async () => {
  Platform.OS = 'android';
  (createGoogleWalletLink as jest.Mock).mockResolvedValue({ url: 'https://evil.example/save' });
  await render(<RewardsScreen />);
  await fireEvent.press(await screen.findByLabelText('Add to Google Wallet'));
  expect(await screen.findByText('Your Google Wallet pass could not be created. Please try again.')).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

it('offers the Wallet button for the card closest to a reward when there are several', async () => {
  Platform.OS = 'ios';
  (getStampCards as jest.Mock).mockResolvedValue([coffee, { ...coffee, campaignId: 'camp2', campaignName: 'Cake Card', stampCount: 5, remainingStamps: 4 }]);
  (createAppleWalletLink as jest.Mock).mockResolvedValue({ url: 'https://api.runmeal.com/apple-wallet/download/t.pkpass' });
  await render(<RewardsScreen />);
  await fireEvent.press(await screen.findByText('Add to Apple Wallet'));
  await waitFor(() => expect(createAppleWalletLink).toHaveBeenCalledWith('b1', 'camp2'));
});

it('asks a signed-out customer to sign in instead', async () => {
  mockAuth.isMember = false;
  await render(<RewardsScreen />);
  expect(screen.getByText('Sign in')).toBeTruthy();
  expect(getMemberQr).not.toHaveBeenCalled();
});
