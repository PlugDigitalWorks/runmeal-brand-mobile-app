import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { refreshAccessToken } from '@/lib/api';
import { OrderStatusStream } from '../order-stream';
import { useOrderLiveStatus } from '../use-order-live-status';

type Listener = (event: Record<string, unknown>) => void;
class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, Listener[]> = {};
  closed = false;
  constructor(
    public url: string,
    public options: { headers: Record<string, string>; pollingInterval: number },
  ) {
    MockEventSource.instances.push(this);
  }
  addEventListener(type: string, listener: Listener) {
    (this.listeners[type] ??= []).push(listener);
  }
  removeAllEventListeners() {
    this.listeners = {};
  }
  close() {
    this.closed = true;
  }
  /** What react-native-sse calls when the server ends the stream. */
  _pollAgain(_time: number, _allowZero: boolean) {}
  emit(type: string, event: Record<string, unknown>) {
    (this.listeners[type] ?? []).forEach((listener) => listener({ type, ...event }));
  }
  status(status: string) {
    this.emit('message', { data: JSON.stringify({ orderId: 'o1', status, updatedAt: '2026-10-22T10:00:00Z' }) });
  }
  serverEnded() {
    this._pollAgain(0, false);
  }
}

jest.mock('react-native-sse', () => ({ __esModule: true, default: jest.fn((url, options) => new MockEventSource(url, options)) }));
jest.mock('@/lib/api', () => ({ refreshAccessToken: jest.fn() }));
let mockToken = 'tok-1';
jest.mock('@/lib/session', () => ({ getAccessToken: () => mockToken }));

const latest = () => MockEventSource.instances.at(-1)!;
const options = { orderId: 'o1', branchId: 'br1', brandId: 'b1' };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  MockEventSource.instances = [];
  mockToken = 'tok-1';
});
afterEach(() => jest.useRealTimers());

it('connects with the bearer, brand and branch headers and reports each status', () => {
  const onStatus = jest.fn();
  const stream = new OrderStatusStream(options, { onStatus, onUnavailable: jest.fn() });
  stream.start();

  expect(latest().url).toBe('https://api.runmeal.com/orders/o1/events');
  expect(latest().options.headers).toEqual({
    Accept: 'text/event-stream',
    Authorization: 'Bearer tok-1',
    'x-brand-id': 'b1',
    'x-branch-id': 'br1',
  });
  expect(latest().options.pollingInterval).toBe(0);

  latest().status('CONFIRMED');
  latest().emit('ping', { data: '' });
  latest().status('PREPARING');
  expect(onStatus.mock.calls.map(([u]) => u.status)).toEqual(['CONFIRMED', 'PREPARING']);
  stream.stop();
});

it('stops for good on an error event and loads the order the normal way', () => {
  const onUnavailable = jest.fn();
  new OrderStatusStream(options, { onStatus: jest.fn(), onUnavailable }).start();
  latest().emit('error', { data: 'Order not found.' });
  latest().serverEnded();
  jest.advanceTimersByTime(60_000);

  expect(onUnavailable).toHaveBeenCalledTimes(1);
  expect(MockEventSource.instances).toHaveLength(1);
  expect(latest().closed).toBe(true);
});

it('does not reconnect after a final status', () => {
  const stream = new OrderStatusStream(options, { onStatus: jest.fn(), onUnavailable: jest.fn() });
  stream.start();
  const first = latest();
  first.status('DELIVERED');
  first.serverEnded();
  jest.advanceTimersByTime(60_000);
  stream.start();

  expect(first.closed).toBe(true);
  expect(MockEventSource.instances).toHaveLength(1);
});

it('reconnects with growing pauses when the connection drops, and resets after a message', () => {
  const stream = new OrderStatusStream(options, { onStatus: jest.fn(), onUnavailable: jest.fn() });
  stream.start();
  latest().emit('error', { xhrStatus: 0 });
  jest.advanceTimersByTime(999);
  expect(MockEventSource.instances).toHaveLength(1);
  jest.advanceTimersByTime(1);
  expect(MockEventSource.instances).toHaveLength(2);

  latest().serverEnded(); // dropped mid-order without a final status
  jest.advanceTimersByTime(1_999);
  expect(MockEventSource.instances).toHaveLength(2);
  jest.advanceTimersByTime(1);
  expect(MockEventSource.instances).toHaveLength(3);

  latest().status('READY');
  latest().emit('error', { xhrStatus: 502 });
  jest.advanceTimersByTime(1_000);
  expect(MockEventSource.instances).toHaveLength(4);
  stream.stop();
});

it('refreshes the token on a 401 and reconnects with the new one', async () => {
  (refreshAccessToken as jest.Mock).mockImplementation(async () => {
    mockToken = 'tok-2';
    return 'tok-2';
  });
  const stream = new OrderStatusStream(options, { onStatus: jest.fn(), onUnavailable: jest.fn() });
  stream.start();
  latest().emit('error', { xhrStatus: 401 });
  await Promise.resolve();
  await Promise.resolve();

  expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  expect(latest().options.headers.Authorization).toBe('Bearer tok-2');
  expect(MockEventSource.instances).toHaveLength(2);
  stream.stop();
});

it('closes in the background and opens again in the foreground, and closes when the screen goes', async () => {
  let onAppState: (state: string) => void = () => undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
    onAppState = handler as (state: string) => void;
    return { remove } as never;
  });
  const { result, unmount } = await renderHook(() => useOrderLiveStatus({ ...options, onUnavailable: jest.fn() }));
  jest.advanceTimersByTime(0);
  expect(MockEventSource.instances).toHaveLength(1);

  await act(async () => latest().status('PREPARING'));
  expect(result.current?.status).toBe('PREPARING');

  await act(async () => onAppState('background'));
  expect(MockEventSource.instances[0].closed).toBe(true);
  await act(async () => onAppState('active'));
  expect(MockEventSource.instances).toHaveLength(2);
  expect(latest().closed).toBe(false);

  await unmount();
  expect(latest().closed).toBe(true);
  expect(remove).toHaveBeenCalled();
});
