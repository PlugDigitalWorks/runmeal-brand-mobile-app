import type { Cart } from '@/types/cart';
import type { OptionGroup, Product } from '@/types/product';
import { buildAddItem, cartLinesFromBackend, summarize } from '../cart-model';

const milk: OptionGroup = {
  id: 'milk',
  name: 'Milk',
  type: 'SINGLE',
  isRequired: true,
  options: [
    { id: 'whole', name: 'Whole', priceDelta: 0, isDefault: true, sortOrder: 0 },
    { id: 'oat', name: 'Oat', priceDelta: 0.5, isDefault: false, sortOrder: 1 },
  ],
};
const extras: OptionGroup = {
  id: 'extras',
  name: 'Extras',
  type: 'MULTI',
  isRequired: false,
  options: [
    { id: 'shot', name: 'Extra shot', priceDelta: 0.7, isDefault: false, sortOrder: 0 },
    { id: 'syrup', name: 'Syrup', priceDelta: 0.4, isDefault: false, sortOrder: 1 },
  ],
};
const swaps: OptionGroup = { id: 'swap', name: 'Remove', type: 'INGREDIENT', isRequired: false, options: [] };
const latte: Product = { id: 'p1', categoryId: 'c', name: 'Latte', description: null, price: '3.90', isActive: true, imageUrl: 'img' };

it('maps selections like brandfe: optionId for single groups, optionIds for multi, skips ingredients', () => {
  const dto = buildAddItem(latte, [milk, extras, swaps], { milk: ['oat'], extras: ['shot', 'syrup'], swap: ['x'] }, 2, ' less hot ');
  expect(dto).toEqual({
    productId: 'p1',
    qty: 2,
    options: [
      { groupId: 'milk', optionId: 'oat' },
      { groupId: 'extras', optionIds: ['shot', 'syrup'] },
    ],
    note: 'less hot',
  });
  expect(buildAddItem(latte, [], {}, 1, '   ')).toEqual({ productId: 'p1', qty: 1 });
});

it('reads backend cart lines and totals', () => {
  const cart: Cart = {
    id: 'cart1',
    brandId: 'b',
    branchId: 'br',
    totalCartPrice: 11.2,
    finalPrice: 10.2,
    discountAmount: 1,
    items: [
      {
        id: 'i1',
        productId: 'p1',
        productName: 'Latte',
        price: 5.6,
        qty: 2,
        imgUrl: null,
        note: 'hot',
        options: [{ type: 'SINGLE', groupId: 'milk', groupName: 'Milk', selections: [{ action: 'SELECT', optionId: 'oat', optionName: 'Oat', priceDelta: 0.5 }] }],
      },
    ],
  };
  const lines = cartLinesFromBackend(cart);
  expect(lines).toEqual([
    { id: 'i1', productId: 'p1', name: 'Latte', imageUrl: null, qty: 2, unitPrice: 5.6, lineTotal: 11.2, optionsText: 'Oat', note: 'hot' },
  ]);
  expect(summarize(lines, cart)).toEqual({ count: 2, subtotal: 11.2, discount: 1, total: 10.2 });
  expect(summarize(lines, null)).toEqual({ count: 2, subtotal: 11.2, discount: 0, total: 11.2 });
});

