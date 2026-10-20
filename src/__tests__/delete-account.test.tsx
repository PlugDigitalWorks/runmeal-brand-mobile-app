import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import DeleteAccountScreen from '@/app/delete-account';
import { deleteAccount } from '@/services/auth.service';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
const mockSignOut = jest.fn();
const mockAuth = { user: { email: 'ada@example.com' }, signOut: mockSignOut };
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/services/auth.service', () => ({ deleteAccount: jest.fn() }));

const pressDestructive = (alert: jest.SpyInstance) => {
  const buttons = alert.mock.calls[0][2];
  buttons.find((b: { style?: string }) => b.style === 'destructive').onPress();
};

beforeEach(() => jest.clearAllMocks());

it('deletes only after a second yes, then signs out', async () => {
  (deleteAccount as jest.Mock).mockResolvedValue(undefined);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<DeleteAccountScreen />);
  expect(screen.getByText('Signed in as ada@example.com.')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('delete-account'));
  expect(deleteAccount).not.toHaveBeenCalled();
  pressDestructive(alert);

  await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  expect(deleteAccount).toHaveBeenCalledTimes(1);
  expect(router.back).toHaveBeenCalled();
  expect(alert).toHaveBeenLastCalledWith('Account deleted', 'Your account has been deleted.');
});

it('keeps the customer signed in when the delete fails', async () => {
  (deleteAccount as jest.Mock).mockRejectedValue(new Error('offline'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<DeleteAccountScreen />);
  await fireEvent.press(screen.getByTestId('delete-account'));
  pressDestructive(alert);

  expect(await screen.findByText("Couldn't delete your account. Try again.")).toBeTruthy();
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
});
