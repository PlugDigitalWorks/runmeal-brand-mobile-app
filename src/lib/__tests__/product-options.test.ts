import type { OptionGroup } from '@/types/product';
import { initialSelections, optionsTotal, toggleOption, validateSelections } from '../product-options';

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
  minSelections: null,
  maxSelections: 2,
  options: [
    { id: 'shot', name: 'Extra shot', priceDelta: 0.7, isDefault: false, sortOrder: 0 },
    { id: 'syrup', name: 'Syrup', priceDelta: 0.4, isDefault: false, sortOrder: 1 },
    { id: 'cream', name: 'Cream', priceDelta: 0.3, isDefault: false, sortOrder: 2 },
  ],
};

it('preselects defaults, one per single-choice group', () => {
  expect(initialSelections([milk, extras])).toEqual({ milk: ['whole'], extras: [] });
});

it('replaces the choice in single groups and toggles in multi groups up to max', () => {
  let s = initialSelections([milk, extras]);
  s = toggleOption(s, milk, 'oat').selections;
  expect(s.milk).toEqual(['oat']);

  s = toggleOption(s, extras, 'shot').selections;
  s = toggleOption(s, extras, 'syrup').selections;
  const over = toggleOption(s, extras, 'cream');
  expect(over.rejected).toEqual({ reason: 'max', count: 2 });
  expect(over.selections.extras).toEqual(['shot', 'syrup']);

  s = toggleOption(s, extras, 'shot').selections;
  expect(s.extras).toEqual(['syrup']);
});

it('reports the first unmet required or minimum rule', () => {
  expect(validateSelections([milk], { milk: [] })).toEqual({ groupName: 'Milk', reason: 'required', count: 1 });
  const atLeastTwo = { ...extras, minSelections: 2 };
  expect(validateSelections([atLeastTwo], { extras: ['shot'] })).toEqual({ groupName: 'Extras', reason: 'min', count: 2 });
  expect(validateSelections([milk, extras], { milk: ['whole'], extras: [] })).toBeNull();
});

it('adds the selected price deltas to the unit price', () => {
  expect(optionsTotal([milk, extras], { milk: ['oat'], extras: ['shot'] })).toBeCloseTo(1.2);
});
