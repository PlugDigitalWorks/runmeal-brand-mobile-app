import { parseIncomingUrl, referrerToUrl, routeForScannedCode, toLinkRoute } from '../links';

const known = ['order.dharmacoffee.uk'];

describe('parseIncomingUrl', () => {
  it('reads the cafe host and the table token from a QR link', () => {
    expect(parseIncomingUrl('https://BCafe.runmeal.com/order?qr=tok_1', known, 'runmeal.com')).toEqual({
      host: 'bcafe.runmeal.com',
      qrToken: 'tok_1',
    });
  });

  it('accepts a cafe custom domain listed in the directory', () => {
    expect(parseIncomingUrl('https://order.dharmacoffee.uk/order?qr=tok_2', known, 'runmeal.com')).toEqual({
      host: 'order.dharmacoffee.uk',
      qrToken: 'tok_2',
    });
  });

  it('reads a plain cafe link without a table', () => {
    expect(parseIncomingUrl('https://bcafe.runmeal.com/', known, 'runmeal.com')).toEqual({
      host: 'bcafe.runmeal.com',
      qrToken: null,
    });
  });

  it('ignores the token outside /order', () => {
    expect(parseIncomingUrl('https://bcafe.runmeal.com/pages/about?qr=x', known, 'runmeal.com')).toEqual({
      host: 'bcafe.runmeal.com',
      qrToken: null,
    });
  });

  it('rejects unknown hosts and non-https links', () => {
    expect(parseIncomingUrl('https://evil.com/order?qr=x', known, 'runmeal.com')).toBeNull();
    expect(parseIncomingUrl('https://dharmacoffee.uk/', known, 'runmeal.com')).toBeNull();
    expect(parseIncomingUrl('https://runmeal.com/', known, 'runmeal.com')).toBeNull();
    expect(parseIncomingUrl('https://a.b.runmeal.com/', known, 'runmeal.com')).toBeNull();
    expect(parseIncomingUrl('http://bcafe.runmeal.com/', known, 'runmeal.com')).toBeNull();
    expect(parseIncomingUrl('not a url', known, 'runmeal.com')).toBeNull();
  });
});

describe('toLinkRoute', () => {
  it('wraps the full URL for the /link screen', () => {
    expect(toLinkRoute('https://bcafe.runmeal.com/order?qr=a&b=c')).toBe(
      '/link?url=https%3A%2F%2Fbcafe.runmeal.com%2Forder%3Fqr%3Da%26b%3Dc',
    );
  });
});

describe('routeForScannedCode', () => {
  it('routes a cafe QR through /link', () => {
    expect(routeForScannedCode(' https://order.dharmacoffee.uk/order?qr=tok_1 ', known, 'runmeal.com')).toBe(
      '/link?url=https%3A%2F%2Forder.dharmacoffee.uk%2Forder%3Fqr%3Dtok_1',
    );
  });

  it('ignores codes that are not cafe links', () => {
    expect(routeForScannedCode('WIFI:S:cafe;T:WPA;P:secret;;', known, 'runmeal.com')).toBeNull();
    expect(routeForScannedCode('https://evil.com/order?qr=x', known, 'runmeal.com')).toBeNull();
  });
});

describe('referrerToUrl', () => {
  it('turns a Play install referrer with a host into the link the user scanned', () => {
    expect(referrerToUrl('host=order.dharmacoffee.uk&qr=tok_1', known, 'runmeal.com')).toBe(
      'https://order.dharmacoffee.uk/order?qr=tok_1',
    );
    expect(referrerToUrl('host=bcafe.runmeal.com', known, 'runmeal.com')).toBe('https://bcafe.runmeal.com/');
  });

  it('falls back to the default domain for a slug-only referrer', () => {
    expect(referrerToUrl('brand=bcafe&qr=tok_1', known, 'runmeal.com')).toBe('https://bcafe.runmeal.com/order?qr=tok_1');
  });

  it('ignores organic installs, unknown hosts and malformed slugs', () => {
    expect(referrerToUrl('utm_source=google-play&utm_medium=organic', known, 'runmeal.com')).toBeNull();
    expect(referrerToUrl('host=evil.com&qr=x', known, 'runmeal.com')).toBeNull();
    expect(referrerToUrl('brand=../evil', known, 'runmeal.com')).toBeNull();
    expect(referrerToUrl('', known, 'runmeal.com')).toBeNull();
  });
});
