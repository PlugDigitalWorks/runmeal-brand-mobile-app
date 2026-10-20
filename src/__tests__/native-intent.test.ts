import { redirectSystemPath } from '@/app/+native-intent';

it("sends the brand's links through /link with the full URL", () => {
  expect(redirectSystemPath({ path: 'https://order.dharmacoffee.uk/order?qr=tok_1', initial: true })).toBe(
    '/link?url=https%3A%2F%2Forder.dharmacoffee.uk%2Forder%3Fqr%3Dtok_1',
  );
});

it('leaves internal and unknown paths alone', () => {
  expect(redirectSystemPath({ path: '/menu', initial: false })).toBe('/menu');
  expect(redirectSystemPath({ path: 'https://evil.com/', initial: true })).toBe('/');
  // Another brand's storefront is not this app's.
  expect(redirectSystemPath({ path: 'https://bcafe.runmeal.com/order?qr=t', initial: true })).toBe('/');
});
