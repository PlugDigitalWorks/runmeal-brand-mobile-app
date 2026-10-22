import EventSource from 'react-native-sse';
import { API_URL } from '@/config';
import { refreshAccessToken } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

/** What GET /orders/:id/events sends on each change, the current status first. */
export type OrderStatusUpdate = { orderId: string; status: string; updatedAt: string };

/** The API ends the stream itself after these; reconnecting would only replay the last one. */
export const FINAL_ORDER_STATUSES = ['DELIVERED', 'CANCELLED'];

const FIRST_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

type StreamEvents = 'message' | 'error' | 'ping';
type Callbacks = {
  onStatus: (update: OrderStatusUpdate) => void;
  /** The API said the order is not available on the stream; load it the normal way instead. */
  onUnavailable: () => void;
};
type Options = { orderId: string; branchId: string; brandId: string };
type ServerEvent = { type: string; data?: string | null; xhrStatus?: number };

/**
 * One order's live status over Server-Sent Events, with the bearer token in a
 * header (React Native has no EventSource of its own). Reconnects with growing
 * pauses when the connection drops: the first message is always the current
 * status, so nothing is missed. Stops for good on a final status or an `error`
 * event from the API. The caller stops it in the background and starts it again
 * in the foreground.
 */
export class OrderStatusStream {
  private source: EventSource<StreamEvents> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryMs = FIRST_RETRY_MS;
  private finished = false;
  private running = false;

  constructor(
    private readonly options: Options,
    private readonly callbacks: Callbacks,
  ) {}

  start(): void {
    if (this.running || this.finished) return;
    this.running = true;
    this.connect();
  }

  /** Closes the connection; `start` opens a new one unless the stream already finished. */
  stop(): void {
    this.running = false;
    this.clearRetry();
    this.closeSource();
  }

  private connect(): void {
    this.closeSource();
    const { orderId, branchId, brandId } = this.options;
    const token = getAccessToken();
    const source = new EventSource<StreamEvents>(`${API_URL}/orders/${encodeURIComponent(orderId)}/events`, {
      headers: {
        Accept: 'text/event-stream',
        'x-brand-id': brandId,
        'x-branch-id': branchId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // The library's own reconnect is off: this class decides when, and whether, to retry.
      pollingInterval: 0,
    });
    this.source = source;
    this.watchStreamEnd(source);

    source.addEventListener('message', (event) => {
      if (source !== this.source || !event.data) return;
      let update: OrderStatusUpdate;
      try {
        update = JSON.parse(event.data) as OrderStatusUpdate;
      } catch {
        return;
      }
      this.retryMs = FIRST_RETRY_MS;
      this.callbacks.onStatus(update);
      if (FINAL_ORDER_STATUSES.includes(update.status)) this.finish();
    });
    // `ping` only keeps an idle connection open.
    source.addEventListener('ping', () => undefined);
    source.addEventListener('error', (event) => {
      if (source !== this.source) return;
      this.handleError(event as ServerEvent);
    });
  }

  private handleError(event: ServerEvent): void {
    // An `error` event the API sent (e.g. "Order not found."): no retry, fall back to a plain load.
    if (event.xhrStatus === undefined && event.type === 'error' && typeof event.data === 'string') {
      this.finish();
      this.callbacks.onUnavailable();
      return;
    }
    if (event.xhrStatus === 401) {
      this.closeSource();
      refreshAccessToken().then(
        () => this.running && !this.finished && this.connect(),
        // The refresh token was refused too: the usual session expiry takes over.
        () => this.finish(),
      );
      return;
    }
    if (event.xhrStatus === 403 || event.xhrStatus === 404) {
      this.finish();
      this.callbacks.onUnavailable();
      return;
    }
    this.scheduleRetry();
  }

  /**
   * react-native-sse reports a stream the server closed only by scheduling its
   * own reconnect; with that turned off, the hook below is how this class hears
   * of it. Without a final status yet, the close was unexpected: retry.
   */
  private watchStreamEnd(source: EventSource<StreamEvents>): void {
    const internals = source as unknown as { _pollAgain: (time: number, allowZero: boolean) => void };
    const original = internals._pollAgain.bind(source);
    internals._pollAgain = (time, allowZero) => {
      if (allowZero) return original(time, allowZero);
      if (source === this.source) this.scheduleRetry();
    };
  }

  private scheduleRetry(): void {
    if (!this.running || this.finished || this.retryTimer) return;
    this.closeSource();
    const wait = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.running && !this.finished) this.connect();
    }, wait);
  }

  private finish(): void {
    this.finished = true;
    this.stop();
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private closeSource(): void {
    const source = this.source;
    this.source = null;
    if (source) {
      source.removeAllEventListeners();
      source.close();
    }
  }
}
