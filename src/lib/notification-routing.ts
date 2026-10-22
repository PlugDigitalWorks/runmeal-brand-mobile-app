/** Where a tapped notification leads, from the `path` the API puts in its data. */
export type NotificationTarget = { href: string; needsSignIn: boolean };

const ORDER_PATH = /^\/orders\/([A-Za-z0-9-]+)\/?$/;

export function notificationTarget(path: unknown): NotificationTarget {
  if (typeof path === 'string') {
    const order = ORDER_PATH.exec(path);
    if (order) return { href: `/orders/${order[1]}`, needsSignIn: true };
    if (path === '/notifications' || path === '/notifications/') return { href: '/notifications', needsSignIn: true };
  }
  return { href: '/home', needsSignIn: false };
}
