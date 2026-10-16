import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBrand } from '@/context/BrandContext';
import { useStorefront } from '@/context/StorefrontContext';
import { BRAND_SCOPED_PREFIX } from '@/lib/brand-store';
import type { TableResolveResponse } from '@/types/table';

const JOURNEY_KEY = `${BRAND_SCOPED_PREFIX}table-journey`;

/** brandfe's QrOrderContext: what GET /tables/resolve/:qrToken said, plus the token itself. */
export interface TableJourney extends TableResolveResponse {
  qrToken: string;
}

type TableValue = {
  journey: TableJourney | null;
  startJourney: (journey: TableJourney) => Promise<void>;
  endJourney: () => Promise<void>;
};

const TableContext = createContext<TableValue | undefined>(undefined);

/** A scanned table pins the branch: its cart and checkout belong to that branch. */
export function TableProvider({ children }: { children: React.ReactNode }) {
  const { brand } = useBrand();
  const { branches, branch, selectBranch } = useStorefront();
  const [journey, setJourney] = useState<TableJourney | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(JOURNEY_KEY).then((raw) => {
      if (cancelled) return;
      try {
        const stored = raw ? (JSON.parse(raw) as TableJourney) : null;
        setJourney(stored && stored.brandId === brand?.brandId ? stored : null);
      } catch {
        setJourney(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [brand?.brandId]);

  useEffect(() => {
    if (!journey || branch?.id === journey.branchId) return;
    const match = branches.find((r) => r.branch.id === journey.branchId)?.branch;
    if (match) selectBranch(match);
  }, [journey, branch?.id, branches, selectBranch]);

  const startJourney = useCallback(async (next: TableJourney) => {
    setJourney(next);
    await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify(next));
  }, []);

  const endJourney = useCallback(async () => {
    setJourney(null);
    await AsyncStorage.removeItem(JOURNEY_KEY);
  }, []);

  const value = useMemo(() => ({ journey, startJourney, endJourney }), [journey, startJourney, endJourney]);
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTable(): TableValue {
  const context = useContext(TableContext);
  if (!context) throw new Error('useTable must be used within a TableProvider');
  return context;
}
