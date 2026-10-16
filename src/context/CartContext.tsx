import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useStorefront } from '@/context/StorefrontContext';
import { useTable } from '@/context/TableContext';
import { BRAND_SCOPED_PREFIX } from '@/lib/brand-store';
import {
  addGuestLine,
  cartLinesFromBackend,
  guestLineFromSelection,
  setGuestQty,
  summarize,
  type CartLine,
  type CartSummary,
  type GuestLine,
} from '@/lib/cart-model';
import type { Selections } from '@/lib/product-options';
import { addCartItem, cartIdOf, getActiveCart, removeCartItem, setCartItemQty } from '@/services/cart.service';
import type { Cart } from '@/types/cart';
import type { OptionGroup, Product } from '@/types/product';

/** brandfe's guest_cart: signed-out lines, kept per branch. */
const GUEST_KEY = `${BRAND_SCOPED_PREFIX}guest-cart`;

type GuestCart = { branchId: string; lines: GuestLine[] };

type CartValue = {
  lines: CartLine[];
  summary: CartSummary;
  cartId: string | null;
  loading: boolean;
  add: (product: Product, groups: OptionGroup[], selections: Selections, qty: number, note: string) => Promise<void>;
  setQty: (lineId: string, qty: number) => Promise<void>;
  /** After an order is placed the API closes the cart; start from an empty one. */
  reload: () => Promise<void>;
};

const CartContext = createContext<CartValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, ensureSession } = useAuth();
  const { branch } = useStorefront();
  const { journey } = useTable();
  const branchId = branch?.id ?? null;
  const [cart, setCart] = useState<Cart | null>(null);
  const [guest, setGuest] = useState<GuestCart | null>(null);
  const [guestLoaded, setGuestLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const syncing = useRef(false);

  const persistGuest = useCallback(async (next: GuestCart | null) => {
    setGuest(next);
    if (next?.lines.length) await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(GUEST_KEY);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_KEY).then((raw) => {
      try {
        setGuest(raw ? (JSON.parse(raw) as GuestCart) : null);
      } catch {
        setGuest(null);
      }
      setGuestLoaded(true);
    });
  }, []);

  const loadRemote = useCallback(async () => {
    if (!branchId) return setCart(null);
    setLoading(true);
    try {
      setCart(await getActiveCart(branchId));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  // Signed in (or a table guest): replay any signed-out lines into the API cart, as brandfe does on login.
  useEffect(() => {
    // Wait for the stored signed-out lines, or a cold start while signed in would drop them.
    if (!user || !branchId || !guestLoaded) return;
    let cancelled = false;
    (async () => {
      const pending = guest?.branchId === branchId ? guest.lines : [];
      if (pending.length && !syncing.current) {
        syncing.current = true;
        try {
          let current = await getActiveCart(branchId);
          for (const line of pending) {
            current = await addCartItem({ ...line.request, ...(cartIdOf(current) ? { cartId: cartIdOf(current)! } : {}) }, branchId);
          }
          await persistGuest(null);
          if (!cancelled) setCart(current);
          return;
        } finally {
          syncing.current = false;
        }
      }
      if (!cancelled) await loadRemote().catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
    // `guest` is read once per sign-in/branch; re-running on every guest edit would re-sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, branchId, guestLoaded]);

  const add = useCallback(
    async (product: Product, groups: OptionGroup[], selections: Selections, qty: number, note: string) => {
      if (!branchId) throw new Error('NO_BRANCH');
      const line = guestLineFromSelection(product, groups, selections, qty, note);
      // A table journey always orders through the API, opening a guest session if needed.
      const signedIn = user ?? (journey ? await ensureSession() : null);
      if (!signedIn) {
        const base = guest?.branchId === branchId ? guest.lines : [];
        await persistGuest({ branchId, lines: addGuestLine(base, line) });
        return;
      }
      const id = cartIdOf(cart?.branchId === branchId ? cart : null);
      try {
        setCart(await addCartItem({ ...line.request, ...(id ? { cartId: id } : {}) }, branchId));
      } catch (error) {
        // A stale cart id (closed by an order elsewhere) is retried without it, like brandfe.
        if (!id) throw error;
        setCart(await addCartItem(line.request, branchId));
      }
    },
    [branchId, user, journey, ensureSession, guest, cart, persistGuest],
  );

  const setQty = useCallback(
    async (lineId: string, qty: number) => {
      if (!branchId) return;
      if (!user) {
        if (guest) await persistGuest({ ...guest, lines: setGuestQty(guest.lines, lineId, qty) });
        return;
      }
      if (qty <= 0) {
        await removeCartItem(lineId, branchId);
        await loadRemote();
      } else {
        setCart(await setCartItemQty(lineId, qty, branchId));
      }
    },
    [branchId, user, guest, persistGuest, loadRemote],
  );

  // A cart left over from another branch or a signed-out session never shows.
  const activeCart = user && cart?.branchId === branchId ? cart : null;
  const lines = useMemo<CartLine[]>(
    () => (user ? cartLinesFromBackend(activeCart) : guest?.branchId === branchId ? guest.lines : []),
    [user, activeCart, guest, branchId],
  );
  const summary = useMemo(() => summarize(lines, activeCart), [lines, activeCart]);

  const value = useMemo(
    () => ({ lines, summary, cartId: cartIdOf(activeCart), loading, add, setQty, reload: loadRemote }),
    [lines, summary, activeCart, loading, add, setQty, loadRemote],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
