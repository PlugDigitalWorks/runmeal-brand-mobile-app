/** `GET /brands/resolve` payload (runmeal-api BrandResolveResult). */
export interface AppBrand {
  brandId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  currency: string;
  currencySymbol: string;
  primaryDomain: string;
  defaultDomain: string;
}
