/** Subset of `GET /branches/nearby/brand/all` rows the app uses. */
export interface Branch {
  id: string;
  name: string;
  slug: string;
  addressText: string | null;
  logoUrl: string | null;
  bannerUrls: string[] | null;
  locationGeog: { type: 'Point'; coordinates: [number, number] } | null;
  currency: string;
  currencySymbol: string;
  distanceM: number | null;
  order_type_settings?: {
    pickup?: { isActive: boolean };
    delivery?: { isActive: boolean };
    scheduledPickup?: { isActive: boolean };
    scheduledDelivery?: { isActive: boolean };
    tableOrder?: { isActive: boolean };
  };
  payment_settings?: {
    isActive?: boolean;
    onlineMethods?: { card?: { isActive: boolean; provider?: string } };
    offlineMethods?: { cash?: { isActive: boolean }; cardOnDelivery?: { isActive: boolean } };
  };
}
