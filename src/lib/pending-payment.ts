/** The provider page handed from checkout to the payment screen (an iyzico form is too big for route params). */
export interface PendingPayment {
  paymentId: string;
  branchId: string;
  cartId: string;
  paymentUrl?: string;
  checkoutFormContent?: string;
}

let pending: PendingPayment | null = null;

export function setPendingPayment(next: PendingPayment): void {
  pending = next;
}

export function getPendingPayment(): PendingPayment | null {
  return pending;
}

export function clearPendingPayment(): void {
  pending = null;
}
