import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { OrderStatusStream, type OrderStatusUpdate } from '@/lib/order-stream';

type Options = { orderId: string; branchId: string; brandId: string | undefined; onUnavailable: () => void };

/**
 * The order's live status while its screen is open and the app is in front.
 * In the background the connection closes; push notifications carry changes there.
 */
export function useOrderLiveStatus({ orderId, branchId, brandId, onUnavailable }: Options): OrderStatusUpdate | null {
  const [update, setUpdate] = useState<OrderStatusUpdate | null>(null);
  // The latest callback, so a new function on each render does not reopen the connection.
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  });

  useEffect(() => {
    if (!orderId || !branchId || !brandId) return;
    const stream = new OrderStatusStream(
      { orderId, branchId, brandId },
      { onStatus: setUpdate, onUnavailable: () => unavailable.current() },
    );
    if (AppState.currentState !== 'background') stream.start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') stream.start();
      else if (state === 'background') stream.stop();
    });
    return () => {
      subscription.remove();
      stream.stop();
    };
  }, [orderId, branchId, brandId]);

  return update?.orderId === orderId ? update : null;
}
