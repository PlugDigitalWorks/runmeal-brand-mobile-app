import { redirectSystemPath } from '@/app/+native-intent';

it('sends every cafe link through /link with the full URL', () => {
  expect(redirectSystemPath({ path: 'https://bcafe.runmeal.com/order?qr=tok_1', initial: true })).toBe(
    '/link?url=https%3A%2F%2Fbcafe.runmeal.com%2Forder%3Fqr%3Dtok_1',
  );
});

it('leaves internal and unknown paths alone', () => {
  expect(redirectSystemPath({ path: '/menu', initial: false })).toBe('/menu');
  expect(redirectSystemPath({ path: 'https://evil.com/', initial: true })).toBe('/');
});
