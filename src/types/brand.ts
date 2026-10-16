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

/** One cafe in the bundled directory, src/data/brands.json. */
export interface DirectoryEntry {
  /** The cafe's active web host, e.g. "order.dharmacoffee.uk". */
  host: string;
  name: string;
  logoUrl?: string | null;
}
