import { formatMoney } from '../money';

it('formats with the narrow currency symbol in the app language', () => {
  expect(formatMoney(4.35, 'GBP', 'en')).toBe('£4.35');
  expect(formatMoney('4.35', 'GBP', 'tr')).toBe('£4,35');
  expect(formatMoney(45, 'TRY', 'tr')).toBe('₺45,00');
});

it('treats missing or broken amounts as zero', () => {
  expect(formatMoney(null, 'GBP', 'en')).toBe('£0.00');
  expect(formatMoney('abc', 'GBP', 'en')).toBe('£0.00');
});
