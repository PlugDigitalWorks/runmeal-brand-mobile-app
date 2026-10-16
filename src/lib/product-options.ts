import type { OptionGroup } from '@/types/product';

/** Selected option ids per option group id. */
export type Selections = Record<string, string[]>;

const isSingle = (group: OptionGroup) => group.type === 'SINGLE' || group.type === 'VARIANT';

/** Defaults preselected the way brandfe's ProductDetailModal does. */
export function initialSelections(groups: OptionGroup[]): Selections {
  const selections: Selections = {};
  for (const group of groups) {
    const defaults = group.options.filter((o) => o.isDefault).map((o) => o.id);
    selections[group.id] = isSingle(group) ? defaults.slice(-1) : defaults;
  }
  return selections;
}

export function toggleOption(
  selections: Selections,
  group: OptionGroup,
  optionId: string,
): { selections: Selections; rejected?: { reason: 'max'; count: number } } {
  const current = selections[group.id] ?? [];
  if (isSingle(group)) return { selections: { ...selections, [group.id]: [optionId] } };
  if (current.includes(optionId)) {
    return { selections: { ...selections, [group.id]: current.filter((id) => id !== optionId) } };
  }
  if (group.maxSelections && current.length >= group.maxSelections) {
    return { selections, rejected: { reason: 'max', count: group.maxSelections } };
  }
  return { selections: { ...selections, [group.id]: [...current, optionId] } };
}

export type SelectionProblem = { groupName: string; reason: 'required' | 'min'; count: number };

export function validateSelections(groups: OptionGroup[], selections: Selections): SelectionProblem | null {
  for (const group of groups) {
    const count = (selections[group.id] ?? []).length;
    if (group.minSelections && count < group.minSelections) {
      return { groupName: group.name, reason: 'min', count: group.minSelections };
    }
    if (group.isRequired && count === 0) return { groupName: group.name, reason: 'required', count: 1 };
  }
  return null;
}

/** Sum of the selected options' price deltas, added to the unit price. */
export function optionsTotal(groups: OptionGroup[], selections: Selections): number {
  let total = 0;
  for (const group of groups) {
    for (const id of selections[group.id] ?? []) {
      total += Number(group.options.find((o) => o.id === id)?.priceDelta ?? 0);
    }
  }
  return total;
}
