import type { OrderItem } from '@/types/order';

/** brandfe's status pill colours: delivered/completed green, cancelled red, everything else blue. */
export function statusTone(status: string): 'success' | 'danger' | 'info' {
  const s = status.toUpperCase();
  if (s === 'DELIVERED' || s === 'COMPLETED') return 'success';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'danger';
  return 'info';
}

/** "PREPARING" → "Preparing" for statuses the copy doesn't name. */
export function humanize(value: string): string {
  const words = value.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function itemQuantity(item: OrderItem): number {
  return Number(item.quantity ?? item.qty ?? 1);
}

/** The order API names line totals differently across versions; brandfe reads them in this order. */
export function itemTotal(item: OrderItem): number {
  const total = item.finalLineTotal ?? item.lineTotal ?? item.totalPrice;
  if (total != null) return Number(total);
  return Number(item.unitPrice ?? item.price ?? 0) * itemQuantity(item);
}

export function itemOptions(item: OrderItem): string {
  return (item.options ?? [])
    .flatMap((group) => group.selections.map((s) => s.optionName))
    .filter(Boolean)
    .join(', ');
}
