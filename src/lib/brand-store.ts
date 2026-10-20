import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppBrand } from '@/types/brand';

const CACHE_KEY = 'rm_brand';
/** Keys for state that belongs to the brand's storefront (guest cart, table journey). */
export const BRAND_SCOPED_PREFIX = 'brand-scoped:';

let activeBrandId: string | null = null;

/** Read synchronously by the axios interceptor. */
export function getBrandId(): string | null {
  return activeBrandId;
}

/** The brand as the API last described it, so a cold start opens without waiting on the network. */
export async function loadCachedBrand(): Promise<AppBrand | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const brand = JSON.parse(raw) as AppBrand;
    activeBrandId = brand.brandId;
    return brand;
  } catch {
    return null;
  }
}

export async function cacheBrand(brand: AppBrand): Promise<void> {
  activeBrandId = brand.brandId;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(brand));
}
