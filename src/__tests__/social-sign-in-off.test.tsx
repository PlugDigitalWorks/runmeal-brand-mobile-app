import { render, screen } from '@testing-library/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SocialSignIn } from '@/components/SocialSignIn';
import '@/i18n';
import { BRAND } from '@brand';

// A build without the Sign in with Apple capability (brand.json signIn.apple off, or PERSONAL_TEAM=1).
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { ios: { usesAppleSignIn: false } } } }));
jest.mock('expo-crypto', () => ({}));
jest.mock('expo-apple-authentication', () => ({ isAvailableAsync: jest.fn(async () => true) }));
jest.mock('@/services/auth.service', () => ({ loginWithApple: jest.fn(), loginWithGoogle: jest.fn() }));
jest.mock('@brand', () => {
  const actual = jest.requireActual('@brand');
  return { ...actual, BRAND: { ...actual.BRAND, signIn: { apple: true, google: false } } };
});

beforeEach(() => {
  BRAND.signIn.google = false;
  jest.clearAllMocks();
});

it('shows nothing when the capability is not in the build', async () => {
  await render(<SocialSignIn onSignedIn={jest.fn()} onError={jest.fn()} />);
  expect(screen.queryByText('or use your email')).toBeNull();
  expect(AppleAuthentication.isAvailableAsync).not.toHaveBeenCalled();
});

it('still shows Google, with the divider, in a build without Apple', async () => {
  BRAND.signIn.google = true;
  await render(<SocialSignIn onSignedIn={jest.fn()} onError={jest.fn()} />);
  expect(screen.getByText('Sign in with Google')).toBeTruthy();
  expect(screen.getByText('or use your email')).toBeTruthy();
  expect(screen.queryByText('Sign in with Apple')).toBeNull();
});

