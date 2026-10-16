import { AxiosError, type AxiosResponse } from 'axios';
import { apiErrorMessage } from '../api-error';

const withBody = (data: unknown) =>
  new AxiosError('x', '400', undefined, undefined, { data, status: 400 } as AxiosResponse);

it('shows the API message when there is one', () => {
  expect(apiErrorMessage(withBody({ message: 'Invalid code.' }), 'fallback')).toBe('Invalid code.');
  expect(apiErrorMessage(withBody({ message: ['email must be an email'] }), 'fallback')).toBe('email must be an email');
});

it('falls back for network and unknown errors', () => {
  expect(apiErrorMessage(withBody({}), 'fallback')).toBe('fallback');
  expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
});
