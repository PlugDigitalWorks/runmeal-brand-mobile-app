import { parseIncomingUrl, referrerToUrl, routeForScannedCode, toLinkRoute } from '../links';

const hosts = ['order.dharmacoffee.uk', 'dharma-coffee.runmeal.com'];

describe('parseIncomingUrl', () => {
  it("reads the table token from a QR link on the brand's host", () => {
    expect(parseIncomingUrl('https://Order.DharmaCoffee.uk/order?qr=tok_2', hosts)).toEqual({ host: 'order.dharmacoffee.uk', qrToken: 'tok_2' });
  });

  it("accepts the brand's other listed host", () => {
    expect(parseIncomingUrl('https://dharma-coffee.runmeal.com/order?qr=t', hosts)).toEqual({ host: 'dharma-coffee.runmeal.com', qrToken: 't' });
  });

  it('reads a plain storefront link without a table', () => {
    expect(parseIncomingUrl('https://order.dharmacoffee.uk/', hosts)).toEqual({ host: 'order.dharmacoffee.uk', qrToken: null });
    expect(parseIncomingUrl('https://order.dharmacoffee.uk/menu?qr=x', hosts)).toEqual({ host: 'order.dharmacoffee.uk', qrToken: null });
  });

  it("rejects other brands, other sites and non-https links", () => {
    expect(parseIncomingUrl('https://bcafe.runmeal.com/order?qr=t', hosts)).toBeNull();
    expect(parseIncomingUrl('https://evil.com/order?qr=t', hosts)).toBeNull();
    expect(parseIncomingUrl('http://order.dharmacoffee.uk/order?qr=t', hosts)).toBeNull();
    expect(parseIncomingUrl('not a url', hosts)).toBeNull();
  });

  it('defaults to the hosts in brand/brand.json', () => {
    expect(parseIncomingUrl('https://order.dharmacoffee.uk/order?qr=t')).toEqual({ host: 'order.dharmacoffee.uk', qrToken: 't' });
  });
});

it('routes scanned codes through /link and ignores other codes', () => {
  expect(routeForScannedCode(' https://order.dharmacoffee.uk/order?qr=t ', hosts)).toBe(toLinkRoute('https://order.dharmacoffee.uk/order?qr=t'));
  expect(routeForScannedCode('WIFI:S:cafe;;', hosts)).toBeNull();
});

describe('referrerToUrl', () => {
  it('rebuilds the scanned table link', () => {
    expect(referrerToUrl('host=order.dharmacoffee.uk&qr=tok 1', hosts)).toBe('https://order.dharmacoffee.uk/order?qr=tok%201');
  });

  it("uses the brand's main host when the referrer has only the table", () => {
    expect(referrerToUrl('qr=tok', hosts)).toBe('https://order.dharmacoffee.uk/order?qr=tok');
  });

  it('ignores a referrer without a table or for another host', () => {
    expect(referrerToUrl('host=order.dharmacoffee.uk', hosts)).toBeNull();
    expect(referrerToUrl('host=evil.com&qr=t', hosts)).toBeNull();
    expect(referrerToUrl('utm_source=google-play', hosts)).toBeNull();
  });
});
