import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { loginWithApple } from '@/services/auth.service';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { ios: { usesAppleSignIn: true } } } }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'raw-nonce'),
  digestStringAsync: jest.fn(async () => 'hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('expo-apple-authentication', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    isAvailableAsync: jest.fn(async () => true),
    signInAsync: jest.fn(),
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { BLACK: 2 },
    AppleAuthenticationButton: ({ onPress }: { onPress: () => void }) => (
      <Pressable onPress={onPress}>
        <Text>Sign in with Apple</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/services/auth.service', () => ({ loginWithApple: jest.fn() }));

const auth = { accessToken: 'a', refreshToken: 'r', sid: 's', user: { id: 'u1' } };

beforeEach(() => {
  jest.clearAllMocks();
  (loginWithApple as jest.Mock).mockResolvedValue(auth);
});

it("gives Apple the nonce's SHA-256 digest and the API the raw nonce, with the first-time name", async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
    identityToken: 'jwt',
    authorizationCode: 'code',
    fullName: { givenName: ' Gökhan ', familyName: 'Çalışkan' },
  });
  const onSignedIn = jest.fn();
  await render(<AppleSignInButton onSignedIn={onSignedIn} onError={jest.fn()} dividerLabel="or use your email" />);
  await fireEvent.press(await screen.findByText('Sign in with Apple'));
  await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(auth));
  expect(Crypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', 'raw-nonce');
  expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1], nonce: 'hashed-nonce' });
  expect(loginWithApple).toHaveBeenCalledWith({
    identityToken: 'jwt',
    authorizationCode: 'code',
    nonce: 'raw-nonce',
    firstName: 'Gökhan',
    lastName: 'Çalışkan',
  });
});

it('sends no name on later sign-ins, when Apple no longer shares it', async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'jwt', authorizationCode: 'code', fullName: null });
  await render(<AppleSignInButton onSignedIn={jest.fn()} onError={jest.fn()} dividerLabel="or" />);
  await fireEvent.press(await screen.findByText('Sign in with Apple'));
  await waitFor(() => expect(loginWithApple).toHaveBeenCalledWith({ identityToken: 'jwt', authorizationCode: 'code', nonce: 'raw-nonce' }));
});

it('treats closing the Apple sheet as a choice, not an error', async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
  const onError = jest.fn();
  await render(<AppleSignInButton onSignedIn={jest.fn()} onError={onError} dividerLabel="or" />);
  await fireEvent.press(await screen.findByText('Sign in with Apple'));
  await waitFor(() => expect(AppleAuthentication.signInAsync).toHaveBeenCalled());
  expect(onError).not.toHaveBeenCalled();
  expect(loginWithApple).not.toHaveBeenCalled();
});

it('reports an API refusal', async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'jwt', authorizationCode: 'code', fullName: null });
  const refusal = Object.assign(new Error('401'), { response: { status: 401 } });
  (loginWithApple as jest.Mock).mockRejectedValue(refusal);
  const onError = jest.fn();
  await render(<AppleSignInButton onSignedIn={jest.fn()} onError={onError} dividerLabel="or" />);
  await fireEvent.press(await screen.findByText('Sign in with Apple'));
  await waitFor(() => expect(onError).toHaveBeenCalledWith(refusal));
});
