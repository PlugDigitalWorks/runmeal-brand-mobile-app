import { greetingFor } from '../greeting';

it('picks the greeting for the hour of day', () => {
  expect(greetingFor(5)).toBe('morning');
  expect(greetingFor(11)).toBe('morning');
  expect(greetingFor(12)).toBe('afternoon');
  expect(greetingFor(17)).toBe('afternoon');
  expect(greetingFor(18)).toBe('evening');
  expect(greetingFor(2)).toBe('evening');
});
