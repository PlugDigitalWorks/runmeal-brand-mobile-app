import { api } from '@/lib/api';
import { createGuestSession, loginWithPassword, registerWithOtp, requestOtpLogin, verifyOtp } from '../auth.service';

jest.mock('@/lib/api', () => ({ AUTH_CLIENT: 'user', api: { post: jest.fn(), get: jest.fn() } }));
const post = api.post as jest.Mock;
const user = { id: 'u1', email: 'a@b.co', firstName: 'Ada', lastName: 'L', role: 'CUSTOMER' };

beforeEach(() => post.mockReset());

it('asks for an emailed code with the reCAPTCHA token and the user client', async () => {
  post.mockResolvedValue({ data: { message: 'sent' } });
  await requestOtpLogin('a@b.co', 'cap');
  expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.co', method: 'otp', client: 'user', recaptchaToken: 'cap' });
});

it('verifies the code and unwraps the session', async () => {
  post.mockResolvedValue({ data: { status: true, message: 'ok', data: { accessToken: 'a', refreshToken: 'r', sid: 's', user } } });
  await expect(verifyOtp('a@b.co', '123456')).resolves.toEqual({ accessToken: 'a', refreshToken: 'r', sid: 's', user });
  expect(post).toHaveBeenCalledWith('/auth/verify-otp', { email: 'a@b.co', code: '123456', client: 'user' });
});

it('accepts a bare session payload too', async () => {
  post.mockResolvedValue({ data: { accessToken: 'a', user } });
  await expect(loginWithPassword('a@b.co', 'secret1', 'cap')).resolves.toEqual({ accessToken: 'a', user });
});

it('registers without a password so the account is confirmed by code', async () => {
  post.mockResolvedValue({ data: { message: 'sent' } });
  await registerWithOtp({ email: 'a@b.co', firstName: 'Ada', lastName: 'Lovelace' });
  expect(post).toHaveBeenCalledWith('/auth/register', { email: 'a@b.co', firstName: 'Ada', lastName: 'Lovelace' });
});

it('marks a table guest session as a guest', async () => {
  post.mockResolvedValue({ data: { status: true, message: 'ok', data: { accessToken: 'g', user } } });
  await expect(createGuestSession()).resolves.toEqual({ accessToken: 'g', user: { ...user, isGuest: true } });
});
