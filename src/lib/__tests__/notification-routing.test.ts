import { notificationTarget } from '../notification-routing';

it('opens an order, the notifications list, or home for anything else', () => {
  expect(notificationTarget('/orders/6f1c2a90-1b2c-4d5e-8f90-123456789abc')).toEqual({
    href: '/orders/6f1c2a90-1b2c-4d5e-8f90-123456789abc',
    needsSignIn: true,
  });
  expect(notificationTarget('/notifications')).toEqual({ href: '/notifications', needsSignIn: true });
  for (const other of ['/orders/', '/orders/a/b', 'https://evil.example/orders/1', '/rewards', undefined, 42]) {
    expect(notificationTarget(other)).toEqual({ href: '/home', needsSignIn: false });
  }
});
