import type { AddItemDto, AddItemOption, Cart } from '@/types/cart';
import type { OptionGroup, Product } from '@/types/product';
import type { Selections } from './product-options';

/** What every cart screen renders, from the API cart. */
export interface CartLine {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  optionsText: string;
  note: string | null;
}

const isSingle = (group: OptionGroup) => group.type === 'SINGLE' || group.type === 'VARIANT';

/**
 * brandfe's ProductDetailModal mapping: single-choice groups send `optionId`,
 * MULTI sends `optionIds`, INGREDIENT groups are not sent (brandfe has no UI
 * for ingredient actions either).
 */
export function buildAddItem(product: Product, groups: OptionGroup[], selections: Selections, qty: number, note: string): AddItemDto {
  const options: AddItemOption[] = [];
  for (const group of groups) {
    const ids = selections[group.id] ?? [];
    if (!ids.length) continue;
    if (isSingle(group)) options.push({ groupId: group.id, optionId: ids[0] });
    else if (group.type === 'MULTI') options.push({ groupId: group.id, optionIds: ids });
  }
  const trimmed = note.trim();
  return { productId: product.id, qty, ...(options.length ? { options } : {}), ...(trimmed ? { note: trimmed } : {}) };
}

export function cartLinesFromBackend(cart: Cart | null): CartLine[] {
  return (cart?.items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.productName ?? '',
    imageUrl: item.imgUrl ?? null,
    qty: item.qty,
    unitPrice: Number(item.price),
    lineTotal: Number(item.lineTotal ?? Number(item.price) * item.qty),
    optionsText: (item.options ?? [])
      .flatMap((group) => group.selections.map((s) => s.optionName))
      .filter(Boolean)
      .join(', '),
    note: item.note ?? null,
  }));
}

export interface CartSummary {
  count: number;
  subtotal: number;
  discount: number;
  total: number;
}

/** The API's totals when it sent them (promotions live there), else the lines' sum. */
export function summarize(lines: CartLine[], cart: Cart | null): CartSummary {
  const subtotal = cart?.totalCartPrice != null ? Number(cart.totalCartPrice) : lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discount = Number(cart?.discountAmount ?? 0);
  const total = cart?.finalPrice != null ? Number(cart.finalPrice) : subtotal - discount;
  return { count: lines.reduce((sum, l) => sum + l.qty, 0), subtotal, discount, total };
}
