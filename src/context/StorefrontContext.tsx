import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBrand } from '@/context/BrandContext';
import { BRAND_SCOPED_PREFIX } from '@/lib/brand-store';
import { sortBranches, type Coordinates, type RankedBranch } from '@/lib/branches';
import { getUserLocation } from '@/lib/location';
import { listBrandBranches } from '@/services/branch.service';
import { getMenu } from '@/services/menu.service';
import type { Branch } from '@/types/branch';
import type { Menu, MenuCategory } from '@/types/product';

const BRANCH_KEY = `${BRAND_SCOPED_PREFIX}branch-id`;

type Status = 'loading' | 'ready' | 'error';

type StorefrontValue = {
  branches: RankedBranch[];
  branch: Branch | null;
  selectBranch: (branch: Branch) => Promise<void>;
  location: Coordinates | null;
  /** Asks for location again; on success the list re-sorts by distance. */
  locate: () => Promise<boolean>;
  menu: Menu | null;
  categories: MenuCategory[];
  menuStatus: Status;
  branchStatus: Status;
  /** Some branch delivers, now or scheduled, so addresses are worth managing. */
  deliveryAvailable: boolean;
  reload: () => void;
};

const StorefrontContext = createContext<StorefrontValue | undefined>(undefined);

/** Only categories that have something to sell, products that are active. */
function visibleCategories(menu: Menu | null): MenuCategory[] {
  if (!menu) return [];
  return menu.categories
    .map((c) => ({ ...c, products: (c.products ?? []).filter((p) => p.isActive) }))
    .filter((c) => c.products.length > 0);
}

/** One more try after a short pause, so a dropped connection at launch doesn't leave the storefront empty. */
async function withRetry<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return load();
  }
}

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const { brand } = useBrand();
  const [branches, setBranches] = useState<RankedBranch[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [branchStatus, setBranchStatus] = useState<Status>('loading');
  const [menu, setMenu] = useState<Menu | null>(null);
  const [menuStatus, setMenuStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  // True while the branch was picked for the customer; a nearer one may replace it once location arrives.
  const autoPicked = useRef(false);

  useEffect(() => {
    if (!brand) return;
    let cancelled = false;
    (async () => {
      try {
        // Location never holds up or breaks the list: without it, branches go by name.
        const [list, me, storedId] = await Promise.all([
          withRetry(() => listBrandBranches(brand.brandId)),
          getUserLocation(),
          AsyncStorage.getItem(BRANCH_KEY).catch(() => null),
        ]);
        if (cancelled) return;
        const ranked = sortBranches(list, me);
        setAllBranches(list);
        setLocation(me);
        setBranches(ranked);
        const stored = ranked.find((r) => r.branch.id === storedId)?.branch;
        // A remembered choice wins; else the nearest one, or the first by name without location.
        autoPicked.current = !stored;
        setBranch(stored ?? ranked[0]?.branch ?? null);
        setBranchStatus('ready');
      } catch {
        if (!cancelled) setBranchStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand, attempt]);

  const branchId = branch?.id ?? null;
  useEffect(() => {
    if (!brand) return;
    let cancelled = false;
    withRetry(() => getMenu(brand.brandId, branchId))
      .then((m) => {
        if (cancelled) return;
        setMenu(m);
        setMenuStatus('ready');
      })
      .catch(() => !cancelled && setMenuStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [brand, branchId, attempt]);

  const locate = useCallback(async () => {
    const me = await getUserLocation();
    if (!me) return false;
    const ranked = sortBranches(allBranches, me);
    setLocation(me);
    setBranches(ranked);
    if (autoPicked.current && ranked[0]) setBranch(ranked[0].branch);
    return true;
  }, [allBranches]);

  // Back from Settings with location turned on: sort by distance without a restart.
  useEffect(() => {
    if (location || !allBranches.length) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') locate();
    });
    return () => subscription.remove();
  }, [location, allBranches.length, locate]);

  const selectBranch = useCallback(async (next: Branch) => {
    autoPicked.current = false;
    setBranch(next);
    await AsyncStorage.setItem(BRANCH_KEY, next.id);
  }, []);

  const reload = useCallback(() => {
    setBranchStatus('loading');
    setMenuStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const categories = useMemo(() => visibleCategories(menu), [menu]);
  const deliveryAvailable = useMemo(
    () => branches.some(({ branch: { order_type_settings: types } }) => !!(types?.delivery?.isActive || types?.scheduledDelivery?.isActive)),
    [branches],
  );
  const value = useMemo(
    () => ({ branches, branch, selectBranch, location, locate, menu, categories, menuStatus, branchStatus, deliveryAvailable, reload }),
    [branches, branch, selectBranch, location, locate, menu, categories, menuStatus, branchStatus, deliveryAvailable, reload],
  );
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontValue {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('useStorefront must be used within a StorefrontProvider');
  return context;
}
