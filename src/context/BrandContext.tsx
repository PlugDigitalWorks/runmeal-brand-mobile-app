import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BRAND } from '@brand';
import { cacheBrand, loadCachedBrand } from '@/lib/brand-store';
import { resolveBrandByHost } from '@/services/brand.service';
import type { AppBrand } from '@/types/brand';

type BrandContextValue = {
  /** The configured brand as the API describes it (id, currency, domains, logo). */
  brand: AppBrand | null;
  ready: boolean;
  /** The brand could not be loaded and nothing is cached yet. */
  failed: boolean;
  retry: () => void;
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

/**
 * The app belongs to one brand (brand/brand.json). It opens straight away from
 * the cached brand and refreshes it from GET /brands/resolve with the brand's
 * web host as Origin, the way its website is resolved.
 */
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<AppBrand | null>(null);
  const [state, setState] = useState<{ attempt: number; settled: boolean; failed: boolean }>({ attempt: 0, settled: false, failed: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedBrand();
      if (cancelled) return;
      if (cached) setBrand(cached);
      try {
        const fresh = await resolveBrandByHost(BRAND.host);
        await cacheBrand(fresh);
        if (!cancelled) {
          setBrand(fresh);
          setState((s) => ({ ...s, settled: true, failed: false }));
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, settled: true, failed: !cached }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.attempt]);

  const retry = useCallback(() => setState((s) => ({ attempt: s.attempt + 1, settled: false, failed: false })), []);
  const ready = !!brand || state.settled;

  const value = useMemo(() => ({ brand, ready, failed: !brand && state.failed, retry }), [brand, ready, state.failed, retry]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand must be used within a BrandProvider');
  return context;
}
