import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import LoginScreen from '@/app/login';
import { loginWithPassword, registerWithOtp, requestOtpLogin, verifyOtp } from '@/services/auth.service';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSignIn = jest.fn().mockResolvedValue(undefined);
const session = { accessToken: 'a', refreshToken: 'r', sid: 's', user: { id: 'u1' } };

jest.mock('expo-router', () => ({
  router: { replace: (p: unknown) => mockReplace(p), back: () => mockBack() },
  useLocalSearchParams: () => ({ next: '/checkout' }),
}));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ signIn: mockSignIn }) }));
jest.mock('@/context/BrandContext', () => ({ useBrand: () => ({ brand: { primaryDomain: 'order.dharmacoffee.uk' } }) }));
// The real widget is Google's page in a WebView; here a button stands in for ticking the box.
jest.mock('@/components/Recaptcha', () => ({
  Recaptcha: ({ host, onToken }: { host: string; onToken: (t: string) => void }) => {
    const { Pressable, Text } = jest.requireActual('react-native');
    return (
      <Pressable onPress={() => onToken(`token-for-${host}`)}>
        <Text>captcha</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/services/auth.service', () => ({
  requestOtpLogin: jest.fn(),
  verifyOtp: jest.fn(),
  loginWithPassword: jest.fn(),
  registerWithOtp: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it('signs in with an emailed code after reCAPTCHA and continues to checkout', async () => {
  (requestOtpLogin as jest.Mock).mockResolvedValue(undefined);
  (verifyOtp as jest.Mock).mockResolvedValue(session);
  await render(<LoginScreen />);

  await fireEvent.changeText(screen.getByTestId('login-email'), ' Ada@Example.com ');
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.press(screen.getByText('captcha'));
  await waitFor(() => expect(requestOtpLogin).toHaveBeenCalledWith('ada@example.com', 'token-for-order.dharmacoffee.uk'));

  await fireEvent.changeText(await screen.findByTestId('login-code'), '12a3456');
  await fireEvent.press(screen.getByText('Verify'));
  await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith('ada@example.com', '123456'));
  expect(mockSignIn).toHaveBeenCalledWith(session);
  expect(mockReplace).toHaveBeenCalledWith('/checkout');
});

it('rejects an invalid email before reCAPTCHA', async () => {
  await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByTestId('login-email'), 'nope');
  await fireEvent.press(screen.getByText('Continue'));
  expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  expect(screen.queryByText('captcha')).toBeNull();
});

it('signs in with a password', async () => {
  (loginWithPassword as jest.Mock).mockResolvedValue(session);
  await render(<LoginScreen />);
  await fireEvent.press(screen.getByText('Use a password instead'));
  await fireEvent.changeText(screen.getByTestId('login-email'), 'ada@example.com');
  await fireEvent.changeText(screen.getByTestId('login-password'), 'secret12');
  // The screen title reads "Sign in" too; the button is the last match.
  await fireEvent.press(screen.getAllByText('Sign in').at(-1)!);
  await fireEvent.press(screen.getByText('captcha'));
  await waitFor(() => expect(loginWithPassword).toHaveBeenCalledWith('ada@example.com', 'secret12', 'token-for-order.dharmacoffee.uk'));
  expect(mockSignIn).toHaveBeenCalledWith(session);
});

it('creates an account confirmed by code', async () => {
  (registerWithOtp as jest.Mock).mockResolvedValue(undefined);
  await render(<LoginScreen />);
  await fireEvent.press(screen.getByText('New here? Create an account'));
  await fireEvent.press(screen.getByText('Create account'));
  expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
});
