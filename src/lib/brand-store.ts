import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppBrand } from '@/types/brand';

const ACTIVE_KEY = 'rm_active_brand';
const RECENT_KEY = 'rm_recent_brands';
/** Every AsyncStorage key that belongs to one cafe starts with this prefix. */
export const BRAND_SCOPED_PREFIX = 'brand-scoped:';
const MAX_RECENT = 5;

let activeBrandId: string | null = null;

/** Read synchronously by the axios interceptor. */
export function getBrandId(): string | null {
  return activeBrandId;
}

export function pushRecent(list: AppBrand[], brand: AppBrand, max = MAX_RECENT): AppBrand[] {
  return [brand, ...list.filter((b) => b.brandId !== brand.brandId)].slice(0, max);
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadBrandState(): Promise<{ active: AppBrand | null; recent: AppBrand[] }> {
  const [active, recent] = await Promise.all([
    readJson<AppBrand>(ACTIVE_KEY),
    readJson<AppBrand[]>(RECENT_KEY),
  ]);
  activeBrandId = active?.brandId ?? null;
  return { active, recent: recent ?? [] };
}

async function clearBrandScopedState(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const scoped = keys.filter((key) => key.startsWith(BRAND_SCOPED_PREFIX));
  if (scoped.length) await AsyncStorage.multiRemove(scoped);
}

export async function saveActiveBrand(brand: AppBrand): Promise<AppBrand[]> {
  const previous = await readJson<AppBrand>(ACTIVE_KEY);
  if (previous && previous.brandId !== brand.brandId) {
    await clearBrandScopedState();
  }
  const recent = pushRecent((await readJson<AppBrand[]>(RECENT_KEY)) ?? [], brand);
  await AsyncStorage.multiSet([
    [ACTIVE_KEY, JSON.stringify(brand)],
    [RECENT_KEY, JSON.stringify(recent)],
  ]);
  activeBrandId = brand.brandId;
  return recent;
}
