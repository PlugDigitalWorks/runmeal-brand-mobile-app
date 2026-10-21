import { Alert } from 'react-native';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import '@/i18n';
import DeleteAccountScreen from '@/app/delete-account';
import { expireSession } from '@/lib/api';
import { deleteAccount } from '@/services/auth.service';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), dismissAll: jest.fn() } }));
const mockAuth = { user: { email: 'ada@example.com', role: 'customer' }, endLocalSession: jest.fn(), signOut: jest.fn() };
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/services/auth.service', () => ({ deleteAccount: jest.fn() }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), expireSession: jest.fn() }));

const apiError = (status: number, data: unknown = {}) => {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = { status, data, headers: {}, config, statusText: String(status) } as AxiosResponse;
  return new AxiosError('fail', String(status), config, undefined, response);
};
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK', { headers: {} } as InternalAxiosRequestConfig);

type Button = { style?: string; onPress?: () => void };
const confirmButtons = (alert: jest.SpyInstance, call = 0): Button[] => alert.mock.calls[call][2];
const pressDelete = (alert: jest.SpyInstance, call = 0) => confirmButtons(alert, call).find((b) => b.style === 'destructive')!.onPress!();

let alert: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

it('sends nothing when the customer backs out of the confirmation', async () => {
  await render(<DeleteAccountScreen />);
  await fireEvent.press(screen.getByTestId('delete-account'));
  expect(alert).toHaveBeenCalledWith('Delete your account?', expect.any(String), expect.any(Array));
  expect(confirmButtons(alert).find((b) => b.style === 'cancel')?.onPress).toBeUndefined();
  expect(deleteAccount).not.toHaveBeenCalled();
});

it('says what is deleted, what is kept, and that Wallet cards may update late', async () => {
  await render(<DeleteAccountScreen />);
  expect(screen.getByText('Your name, email, phone number and saved addresses are deleted.')).toBeTruthy();
  expect(screen.getByText('Your past orders and payment records are kept, as the law requires.')).toBeTruthy();
  expect(screen.getByText(/may take a while to update/)).toBeTruthy();
});

it('deletes once even when confirmed twice, then clears only this phone and starts over at sign-in', async () => {
  let finish: () => void = () => undefined;
  (deleteAccount as jest.Mock).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
  await render(<DeleteAccountScreen />);
  await fireEvent.press(screen.getByTestId('delete-account'));
  pressDelete(alert);
  pressDelete(alert);
  expect(await screen.findByText('Deleting…')).toBeTruthy();
  finish();

  await waitFor(() => expect(mockAuth.endLocalSession).toHaveBeenCalledTimes(1));
  expect(deleteAccount).toHaveBeenCalledTimes(1);
  expect(mockAuth.signOut).not.toHaveBeenCalled();
  expect(router.dismissAll).toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith('/login');
  expect(alert).toHaveBeenLastCalledWith('Account deleted', 'Your account has been deleted.');
});

it.each([
  ['USER_ACCOUNT_DELETE_BALANCE_REMAINING', 409, 'Your wallet balance must be settled before deleting your account.'],
  ['USER_ACCOUNT_DELETE_ACTIVE_OPERATION', 409, 'Complete your active orders and pending payments before deleting your account.'],
  ['USER_ACCOUNT_DELETE_PROVIDER_UNAVAILABLE', 503, 'Your account could not be deleted. Please try again later.'],
])('keeps the session on %s and lets the customer try again', async (code, status, message) => {
  (deleteAccount as jest.Mock).mockRejectedValueOnce(apiError(status, { status: false, code, message: 'internal detail' }));
  await render(<DeleteAccountScreen />);
  await fireEvent.press(screen.getByTestId('delete-account'));
  pressDelete(alert);

  expect(await screen.findByText(message)).toBeTruthy();
  expect(screen.queryByText('internal detail')).toBeNull();
  expect(mockAuth.endLocalSession).not.toHaveBeenCalled();
  expect(expireSession).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();

  (deleteAccount as jest.Mock).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByTestId('delete-account'));
  pressDelete(alert, 1);
  await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(2));
});

it('ends the session the usual way on a 401, without claiming the account was deleted', async () => {
  (deleteAccount as jest.Mock).mockRejectedValueOnce(apiError(401));
  await render(<DeleteAccountScreen />);
  await fireEvent.press(screen.getByTestId('delete-account'));
  pressDelete(alert);

  await waitFor(() => expect(expireSession).toHaveBeenCalled());
  expect(router.back).toHaveBeenCalled();
  expect(mockAuth.endLocalSession).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalledWith('Account deleted', expect.anything());
});

it("shows the API's own message on a 403 and keeps the session", async () => {
  (deleteAccount as jest.Mock).mockRejectedValueOnce(apiError(403, { code: 'FORBIDDEN', message: 'You cannot do this.' }));
  await render(<DeleteAccountScreen />);
  await fireEvent.press(screen.getByTestId('delete-account'));
  pressDelete(alert);

  expect(await screen.findByText('You cannot do this.')).toBeTruthy();
  expect(mockAuth.endLocalSession).not.toHaveBeenCalled();
});

it('says the outcome is unknown when the request gets no answer, and never resends it', async () => {
  (deleteAccount as jest.Mock).mockRejectedValueOnce(networkError());
  await render(<DeleteAccountScreen />);
  await fireEvent.press(screen.getByTestId('delete-account'));
  pressDelete(alert);

  expect(await screen.findByText(/couldn't confirm whether your account was deleted/)).toBeTruthy();
  expect(deleteAccount).toHaveBeenCalledTimes(1);
  expect(mockAuth.endLocalSession).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalledWith('Account deleted', expect.anything());
});
