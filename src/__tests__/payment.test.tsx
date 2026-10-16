import { render, waitFor } from '@testing-library/react-native';
import '@/i18n';
import PaymentScreen from '@/app/payment';
import { getPendingPayment, setPendingPayment } from '@/lib/pending-payment';
import { getMyOrders } from '@/services/order.service';

const mockReplace = jest.fn();
const mockReload = jest.fn().mockResolvedValue(undefined);
let webViewProps: { onShouldStartLoadWithRequest: (r: { url: string }) => boolean; source: unknown };

jest.mock('expo-router', () => ({ router: { replace: (p: unknown) => mockReplace(p), back: jest.fn() } }));
jest.mock('@/context/BrandContext', () => ({ useBrand: () => ({ brand: { primaryDomain: 'order.dharmacoffee.uk' } }) }));
jest.mock('@/context/CartContext', () => ({ useCart: () => ({ reload: mockReload }) }));
jest.mock('@/services/order.service', () => ({ getMyOrders: jest.fn() }));
jest.mock('react-native-webview', () => ({
  WebView: (props: typeof webViewProps) => {
    webViewProps = props;
    return null;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  setPendingPayment({ paymentId: 'pay1', branchId: 'br1', cartId: 'cart1', paymentUrl: 'https://pay.example/1' });
});

it("opens the provider page and lets the provider's own pages load", async () => {
  await render(<PaymentScreen />);
  expect(webViewProps.source).toEqual({ uri: 'https://pay.example/1' });
  expect(webViewProps.onShouldStartLoadWithRequest({ url: 'https://pay.example/1/3ds' })).toBe(true);
});

it('stops at the callback and shows the placed order', async () => {
  await render(<PaymentScreen />);
  const allowed = webViewProps.onShouldStartLoadWithRequest({
    url: 'https://order.dharmacoffee.uk/payment/callback?status=success&paymentId=pay1&orderId=o1',
  });
  expect(allowed).toBe(false);
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: 'o1', branchId: 'br1', placed: '1' } }),
  );
  expect(mockReload).toHaveBeenCalled();
  expect(getPendingPayment()).toBeNull();
});

it('finds the order by cart when the provider returns without an order id', async () => {
  (getMyOrders as jest.Mock).mockResolvedValue([{ id: 'o7', cartId: 'cart1' }]);
  await render(<PaymentScreen />);
  webViewProps.onShouldStartLoadWithRequest({ url: 'https://brandfe.runmeal.com/payment/callback?status=success&paymentId=pay1' });
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: 'o7', branchId: 'br1', placed: '1' } }),
  );
});

it('shows a retry when the payment fails', async () => {
  const { findByText } = await render(<PaymentScreen />);
  webViewProps.onShouldStartLoadWithRequest({ url: 'https://order.dharmacoffee.uk/payment/callback?status=failure&paymentId=pay1' });
  expect(await findByText("The payment didn't go through.")).toBeTruthy();
  expect(await findByText('Try again')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
