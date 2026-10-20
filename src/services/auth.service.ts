import { api, AUTH_CLIENT } from '@/lib/api';
import { unwrap } from '@/lib/unwrap';
import type { ApiResponse } from '@/types/api';
import type { AuthResponse, RegisterInput, User } from '@/types/auth';

type Envelope<T> = ApiResponse<T> | T;

/** Emails a 6-digit sign-in code. Production rejects it without a reCAPTCHA token. */
export async function requestOtpLogin(email: string, recaptchaToken: string): Promise<void> {
  await api.post('/auth/login', { email, method: 'otp', client: AUTH_CLIENT, recaptchaToken });
}

export async function loginWithPassword(email: string, password: string, recaptchaToken: string): Promise<AuthResponse> {
  const { data } = await api.post<Envelope<AuthResponse>>('/auth/login', {
    email,
    password,
    method: 'password',
    client: AUTH_CLIENT,
    recaptchaToken,
  });
  return unwrap(data);
}

/** Creates the account and emails a code; `verifyOtp` then signs the new user in. */
export async function registerWithOtp(input: RegisterInput): Promise<void> {
  await api.post('/auth/register', input);
}

export async function verifyOtp(email: string, code: string): Promise<AuthResponse> {
  const { data } = await api.post<Envelope<AuthResponse>>('/auth/verify-otp', { email, code, client: AUTH_CLIENT });
  return unwrap(data);
}

/** What the iOS Apple sheet returned, plus the raw nonce whose SHA-256 hex digest Apple signed. */
export type AppleSignInInput = {
  identityToken: string;
  authorizationCode: string;
  nonce: string;
  firstName?: string;
  lastName?: string;
};

/** runmeal-api POST /auth/apple/native: answers like /auth/verify-otp in body mode. */
export async function loginWithApple(input: AppleSignInInput): Promise<AuthResponse> {
  const { data } = await api.post<Envelope<AuthResponse>>('/auth/apple/native', { ...input, client: AUTH_CLIENT });
  return unwrap(data);
}

/** runmeal-api POST /auth/google/native: the ID token from the native Google sheet. */
export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<Envelope<AuthResponse>>('/auth/google/native', { idToken, client: AUTH_CLIENT });
  return unwrap(data);
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get<Envelope<User>>('/profile');
  return unwrap(data);
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/**
 * Requested from runmeal-api (docs/BACKEND_REQUEST_ACCOUNT_DELETION.md): deletes the
 * signed-in account, revokes its Apple grant and ends every session.
 */
export async function deleteAccount(): Promise<void> {
  await api.delete('/profile');
}
