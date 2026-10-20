import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useStorefront } from '@/context/StorefrontContext';
import { buildAddItem, cartLinesFromBackend, summarize, type CartLine, type CartSummary } from '@/lib/cart-model';
import type { Selections } from '@/lib/product-options';
import { addCartItem, cartIdOf, getActiveCart, removeCartItem, setCartItemQty } from '@/services/cart.service';
import type { Cart } from '@/types/cart';
import type { OptionGroup, Product } from '@/types/product';

type CartValue = {
  lines: CartLine[];
  summary: CartSummary;
  cartId: string | null;
  loading: boolean;
  /** Members only: the product screen sends a signed-out customer to sign in first. */
  add: (product: Product, groups: OptionGroup[], selections: Selections, qty: number, note: string) => Promise<void>;
  setQty: (lineId: string, qty: number) => Promise<void>;
  /** After an order is placed the API closes the cart; start from an empty one. */
  reload: () => Promise<void>;
};

const CartContext = createContext<CartValue | undefined>(undefined);

/**
 * The signed-in customer's API cart for the selected branch. Unlike the
 * website, this app has no signed-out cart: ordering starts with signing in.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isMember } = useAuth();
  const { branch } = useStorefront();
  const branchId = branch?.id ?? null;
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRemote = useCallback(async () => {
    if (!branchId) return setCart(null);
    setLoading(true);
    try {
      setCart(await getActiveCart(branchId));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (!isMember || !branchId) return;
    let cancelled = false;
    getActiveCart(branchId)
      .then((next) => !cancelled && setCart(next))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isMember, user?.id, branchId]);

  const add = useCallback(
    async (product: Product, groups: OptionGroup[], selections: Selections, qty: number, note: string) => {
      if (!branchId) throw new Error('NO_BRANCH');
      if (!isMember) throw new Error('SIGN_IN_REQUIRED');
      const request = buildAddItem(product, groups, selections, qty, note);
      const id = cartIdOf(cart?.branchId === branchId ? cart : null);
      try {
        setCart(await addCartItem({ ...request, ...(id ? { cartId: id } : {}) }, branchId));
      } catch (error) {
        // A cart closed by an order elsewhere answers 404; only then retry without its id, like brandfe.
        if (!id || !isAxiosError(error) || error.response?.status !== 404) throw error;
        setCart(await addCartItem(request, branchId));
      }
    },
    [branchId, isMember, cart],
  );

  const setQty = useCallback(
    async (lineId: string, qty: number) => {
      if (!branchId || !isMember) return;
      if (qty <= 0) {
        await removeCartItem(lineId, branchId);
        await loadRemote();
      } else {
        setCart(await setCartItemQty(lineId, qty, branchId));
      }
    },
    [branchId, isMember, loadRemote],
  );

  // A cart left over from another branch or a previous account never shows.
  const activeCart = isMember && cart?.branchId === branchId ? cart : null;
  const lines = useMemo<CartLine[]>(() => cartLinesFromBackend(activeCart), [activeCart]);
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
