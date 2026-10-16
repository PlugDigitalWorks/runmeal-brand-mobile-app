import { humanize, itemOptions, itemQuantity, itemTotal, statusTone } from '../order-display';

it('colours statuses like brandfe', () => {
  expect(statusTone('completed')).toBe('success');
  expect(statusTone('DELIVERED')).toBe('success');
  expect(statusTone('CANCELLED')).toBe('danger');
  expect(statusTone('PREPARING')).toBe('info');
});

it('humanizes raw statuses', () => {
  expect(humanize('ON_THE_WAY')).toBe('On the way');
});

it('reads line totals across API versions', () => {
  expect(itemTotal({ id: '1', productName: 'x', finalLineTotal: '4.5', lineTotal: 5 })).toBe(4.5);
  expect(itemTotal({ id: '1', productName: 'x', totalPrice: '6' })).toBe(6);
  expect(itemTotal({ id: '1', productName: 'x', unitPrice: '2', quantity: 3 })).toBe(6);
  expect(itemQuantity({ id: '1', productName: 'x', qty: 2 })).toBe(2);
  expect(itemOptions({ id: '1', productName: 'x', options: [{ groupName: 'Milk', selections: [{ optionName: 'Oat' }] }] })).toBe('Oat');
});
