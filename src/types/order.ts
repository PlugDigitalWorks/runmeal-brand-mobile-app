/** Mirrors brandfe's order and payment service types. */
export type PaymentMethod = 'ONLINE_CARD' | 'CASH' | 'CARD_ON_DELIVERY';
export type OrderType = 'DELIVERY' | 'SCHEDULED_DELIVERY' | 'PICKUP' | 'SCHEDULED_PICKUP' | 'TABLE_ORDER';
export type ScheduledOrderType = 'SCHEDULED_DELIVERY' | 'SCHEDULED_PICKUP';

export interface PaymentInitializationResponse {
  paymentId: string;
  orderId?: string;
  orderNumber?: number;
  /** iyzico: an HTML form to render. */
  checkoutFormContent?: string;
  /** Stripe, PayTR, Dojo: a hosted page to open. */
  paymentUrl?: string;
}

export interface InitializePaymentInput {
  cartId: string;
  branchId: string;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  tableId?: string;
  scheduledFor?: string;
  note?: string;
}

export interface FulfillmentSlot {
  label: string;
  /** Opaque backend value; never parse it. */
  value: string;
}

export interface FulfillmentSlotsResponse {
  orderType: ScheduledOrderType;
  available: boolean;
  dates: { date: string; slots: FulfillmentSlot[] }[];
}

export interface BranchAvailability {
  canAcceptOrders: boolean;
  reason: string | null;
}

export interface OrderItemOptionGroup {
  groupName: string;
  selections: { optionName: string }[];
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number | string;
  price?: number | string;
  totalPrice?: number | string;
  lineTotal?: number | string | null;
  finalLineTotal?: number | string | null;
  options?: OrderItemOptionGroup[] | null;
  note?: string | null;
}

export interface Order {
  id: string;
  orderNumber: number;
  createdAt: string;
  brandId: string;
  branchId: string;
  cartId: string;
  totalPrice: string;
  status: string;
  orderType?: string;
  paymentMethod?: string;
  tableLabel?: string | null;
  currency?: string;
  scheduledFor?: string | null;
  discountAmount?: number | string | null;
  note?: string | null;
  addressText?: string;
}

export interface OrderDetails extends Order {
  items: OrderItem[];
}

/** POST /orders/table/pay-later answers with the order it opened. */
export interface TableOrderView {
  id: string;
  orderNumber?: number;
  status?: string;
  tableLabel?: string | null;
  totalPrice: string | number;
  currency?: string;
}

export interface Address {
  id: string;
  title?: string | null;
  countryCode: string;
  province: string;
  district: string;
  neighborhood?: string;
  phoneE164?: string | null;
  postalCode: string;
  /** Since brandfe's single-line form, the whole first line (street, house and flat number). */
  street: string;
  buildingNumber?: string | null;
  apartmentNumber?: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export interface CreateAddressInput {
  countryCode: string;
  province: string;
  district: string;
  postalCode: string;
  street: string;
  /** Sent as null: the first line lives in `street`, and null clears an older separate value. */
  buildingNumber?: string | null;
  apartmentNumber?: string | null;
  latitude: number;
  longitude: number;
  phoneE164?: string;
  isActive?: boolean;
}
