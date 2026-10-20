import { render, screen } from '@testing-library/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AppleSignInButton } from '@/components/AppleSignInButton';

// A build without the Sign in with Apple capability (brand.json signIn.apple off, or PERSONAL_TEAM=1).
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { ios: { usesAppleSignIn: false } } } }));
jest.mock('expo-crypto', () => ({}));
jest.mock('expo-apple-authentication', () => ({ isAvailableAsync: jest.fn(async () => true) }));
jest.mock('@/services/auth.service', () => ({ loginWithApple: jest.fn() }));

it('shows nothing when the capability is not in the build', async () => {
  await render(<AppleSignInButton onSignedIn={jest.fn()} onError={jest.fn()} dividerLabel="or use your email" />);
  expect(screen.queryByText('or use your email')).toBeNull();
  expect(AppleAuthentication.isAvailableAsync).not.toHaveBeenCalled();
});
