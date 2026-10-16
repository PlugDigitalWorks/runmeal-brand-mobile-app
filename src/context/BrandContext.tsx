import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadBrandState, saveActiveBrand } from '@/lib/brand-store';
import type { AppBrand } from '@/types/brand';

type BrandContextValue = {
  brand: AppBrand | null;
  recent: AppBrand[];
  ready: boolean;
  selectBrand: (brand: AppBrand) => Promise<void>;
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<AppBrand | null>(null);
  const [recent, setRecent] = useState<AppBrand[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadBrandState().then((state) => {
      setBrand(state.active);
      setRecent(state.recent);
      setReady(true);
    });
  }, []);

  const selectBrand = useCallback(async (next: AppBrand) => {
    setRecent(await saveActiveBrand(next));
    setBrand(next);
  }, []);

  const value = useMemo(() => ({ brand, recent, ready, selectBrand }), [brand, recent, ready, selectBrand]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand must be used within a BrandProvider');
  return context;
}
