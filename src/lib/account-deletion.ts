import { isAxiosError } from 'axios';
import { SessionEndedError } from '@/lib/api';

/** runmeal-api's refusals for DELETE /profile; the account and session stay as they were. */
export const ACCOUNT_DELETE_ERROR_CODES = [
  'USER_ACCOUNT_DELETE_BALANCE_REMAINING',
  'USER_ACCOUNT_DELETE_ACTIVE_OPERATION',
  'USER_ACCOUNT_DELETE_PROVIDER_UNAVAILABLE',
] as const;

export type AccountDeleteErrorCode = (typeof ACCOUNT_DELETE_ERROR_CODES)[number];

export type DeleteFailure =
  /** The API refused with a known reason; the customer can act on it or try later. */
  | { kind: 'refused'; code: AccountDeleteErrorCode }
  /** Still 401 after the silent refresh: the session is over, nothing was deleted. */
  | { kind: 'expired' }
  /** 403: the API's own message, as elsewhere in the app. */
  | { kind: 'forbidden'; message: string | null }
  /** No answer (offline, timeout): the account may or may not be gone. */
  | { kind: 'unknown' }
  /** Any other answer: nothing was deleted. */
  | { kind: 'failed' };

const isKnownCode = (code: unknown): code is AccountDeleteErrorCode =>
  typeof code === 'string' && (ACCOUNT_DELETE_ERROR_CODES as readonly string[]).includes(code);

export function classifyDeleteError(error: unknown): DeleteFailure {
  if (error instanceof SessionEndedError) return { kind: 'expired' };
  if (!isAxiosError(error)) return { kind: 'failed' };
  const response = error.response;
  if (!response) return { kind: 'unknown' };
  const body = response.data as { code?: unknown; message?: unknown } | undefined;
  if (isKnownCode(body?.code)) return { kind: 'refused', code: body.code };
  if (response.status === 401) return { kind: 'expired' };
  if (response.status === 403) {
    return { kind: 'forbidden', message: typeof body?.message === 'string' && body.message.trim() ? body.message : null };
  }
  return { kind: 'failed' };
}
