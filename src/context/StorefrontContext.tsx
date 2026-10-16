import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  menu: Menu | null;
  categories: MenuCategory[];
  menuStatus: Status;
  branchStatus: Status;
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

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const { brand } = useBrand();
  const [branches, setBranches] = useState<RankedBranch[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [branchStatus, setBranchStatus] = useState<Status>('loading');
  const [menu, setMenu] = useState<Menu | null>(null);
  const [menuStatus, setMenuStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!brand) return;
    let cancelled = false;
    (async () => {
      try {
        const [list, me, storedId] = await Promise.all([
          listBrandBranches(brand.brandId),
          getUserLocation(),
          AsyncStorage.getItem(BRANCH_KEY),
        ]);
        if (cancelled) return;
        const ranked = sortBranches(list, me);
        setLocation(me);
        setBranches(ranked);
        const stored = ranked.find((r) => r.branch.id === storedId)?.branch;
        // A remembered choice wins; else the nearest one, or the only one.
        setBranch(stored ?? (me || ranked.length === 1 ? (ranked[0]?.branch ?? null) : null));
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
    getMenu(brand.brandId, branchId)
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

  const selectBranch = useCallback(async (next: Branch) => {
    setBranch(next);
    await AsyncStorage.setItem(BRANCH_KEY, next.id);
  }, []);

  const reload = useCallback(() => {
    setBranchStatus('loading');
    setMenuStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const categories = useMemo(() => visibleCategories(menu), [menu]);
  const value = useMemo(
    () => ({ branches, branch, selectBranch, location, menu, categories, menuStatus, branchStatus, reload }),
    [branches, branch, selectBranch, location, menu, categories, menuStatus, branchStatus, reload],
  );
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontValue {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('useStorefront must be used within a StorefrontProvider');
  return context;
}
