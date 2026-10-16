import type { AddItemDto, AddItemOption, Cart } from '@/types/cart';
import type { OptionGroup, Product } from '@/types/product';
import { optionsTotal, type Selections } from './product-options';

/** What every cart screen renders, whether the cart lives on the phone or on the API. */
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

/** A signed-out cart line; `request` is replayed against POST /carts/items after sign-in. */
export interface GuestLine extends CartLine {
  request: AddItemDto;
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

function selectedNames(groups: OptionGroup[], selections: Selections): string {
  return groups
    .flatMap((group) => (selections[group.id] ?? []).map((id) => group.options.find((o) => o.id === id)?.name))
    .filter(Boolean)
    .join(', ');
}

let sequence = 0;

export function guestLineFromSelection(
  product: Product,
  groups: OptionGroup[],
  selections: Selections,
  qty: number,
  note: string,
): GuestLine {
  const request = buildAddItem(product, groups, selections, qty, note);
  const unitPrice = Number(product.discountedPrice ?? product.price) + optionsTotal(groups, selections);
  sequence += 1;
  return {
    id: `guest-${Date.now().toString(36)}-${sequence}`,
    productId: product.id,
    name: product.name,
    imageUrl: product.imageUrl ?? null,
    qty,
    unitPrice,
    lineTotal: unitPrice * qty,
    optionsText: selectedNames(groups, selections),
    note: request.note ?? null,
    request,
  };
}

const sameItem = (a: GuestLine, b: GuestLine) =>
  a.productId === b.productId &&
  JSON.stringify(a.request.options ?? []) === JSON.stringify(b.request.options ?? []) &&
  (a.note ?? '') === (b.note ?? '');

export function addGuestLine(lines: GuestLine[], line: GuestLine): GuestLine[] {
  const match = lines.find((l) => sameItem(l, line));
  if (!match) return [...lines, line];
  return lines.map((l) => (l === match ? withQty(l, l.qty + line.qty) : l));
}

function withQty(line: GuestLine, qty: number): GuestLine {
  return { ...line, qty, lineTotal: line.unitPrice * qty, request: { ...line.request, qty } };
}

export function setGuestQty(lines: GuestLine[], lineId: string, qty: number): GuestLine[] {
  if (qty <= 0) return lines.filter((l) => l.id !== lineId);
  return lines.map((l) => (l.id === lineId ? withQty(l, qty) : l));
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
