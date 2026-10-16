import { formatMoney } from '../money';

it('formats with the narrow currency symbol', () => {
  expect(formatMoney(4.35, 'GBP')).toBe('£4.35');
  expect(formatMoney('4.35', 'GBP')).toBe('£4.35');
  expect(formatMoney(45, 'TRY')).toBe('₺45.00');
});

it('treats missing or broken amounts as zero', () => {
  expect(formatMoney(null, 'GBP')).toBe('£0.00');
  expect(formatMoney('abc', 'GBP')).toBe('£0.00');
});
