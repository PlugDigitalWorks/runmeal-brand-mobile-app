import { addressFirstLine, addressSecondLine, normalizePhone } from '../address';

it('shows one first line, folding in an older separate house and flat number', () => {
  expect(addressFirstLine({ street: '3 George Street', buildingNumber: null, apartmentNumber: null })).toBe('3 George Street');
  expect(addressFirstLine({ street: 'George Street', buildingNumber: '3', apartmentNumber: '1' })).toBe('George Street, 3 / 1');
  expect(addressFirstLine({ street: 'George Street', buildingNumber: '-', apartmentNumber: '' })).toBe('George Street');
});

it('puts town and postcode on the second line', () => {
  expect(addressSecondLine({ district: 'Richmond', province: 'Greater London', postalCode: 'TW9 1HY' })).toBe('Richmond, Greater London TW9 1HY');
  expect(addressSecondLine({ district: 'London', province: 'London', postalCode: 'SW1A 1AA' })).toBe('London SW1A 1AA');
});

it('accepts phone numbers the API accepts', () => {
  expect(normalizePhone('+44 7700 900123')).toBe('+447700900123');
  expect(normalizePhone('07700 900123')).toBeNull();
  expect(normalizePhone('+44')).toBeNull();
});
