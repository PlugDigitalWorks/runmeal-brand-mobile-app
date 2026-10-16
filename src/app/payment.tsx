import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Lock, X } from 'lucide-react-native';
import { useBrand } from '@/context/BrandContext';
import { useCart } from '@/context/CartContext';
import { parsePaymentCallback, type PaymentCallback } from '@/lib/checkout';
import { clearPendingPayment, getPendingPayment } from '@/lib/pending-payment';
import { getMyOrders } from '@/services/order.service';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, font, space } from '@/theme';

/**
 * The provider's hosted page (Stripe, PayTR, Dojo) or iyzico's form, inside the
 * app. The provider returns to `{cafe}/payment/callback?status=…`; that request
 * is intercepted here and never loads brandfe.
 */
export default function PaymentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();
  const { reload } = useCart();
  const [pending] = useState(getPendingPayment);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const handled = useRef(false);
  const cafeOrigin = `https://${brand?.primaryDomain ?? brand?.defaultDomain ?? 'runmeal.com'}`;

  const finish = async (result: PaymentCallback): Promise<void> => {
    if (handled.current || !pending) return;
    handled.current = true;
    if (result.status === 'failure') {
      setFailed(true);
      return;
    }
    let orderId = result.orderId;
    if (!orderId) {
      // Some providers come back without the order id; brandfe looks it up by cart (findOrderByCartId).
      orderId = (await getMyOrders().catch(() => [])).find((order) => order.cartId === pending.cartId)?.id ?? null;
    }
    clearPendingPayment();
    await reload().catch(() => undefined);
    if (orderId) router.replace({ pathname: '/orders/[id]', params: { id: orderId, branchId: pending.branchId, placed: '1' } });
    else router.replace('/orders');
  };

  const intercept = (request: { url: string }): boolean => {
    const result = parsePaymentCallback(request.url);
    if (!result) return true;
    finish(result);
    return false;
  };

  const retry = () => {
    handled.current = false;
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const close = () => {
    clearPendingPayment();
    router.back();
  };

  const source = pending?.paymentUrl
    ? { uri: pending.paymentUrl }
    : { html: pending?.checkoutFormContent ?? '', baseUrl: `${cafeOrigin}/checkout` };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Lock size={16} color={colors.success} />
        <Text style={styles.title}>{t('payment.title')}</Text>
        <Pressable onPress={close} hitSlop={10} accessibilityLabel={t('payment.cancel')}>
          <X size={24} color={colors.zinc500} />
        </Pressable>
      </View>
      {!pending || failed ? (
        <View style={styles.center}>
          <EmptyState
            icon={<X size={32} color={colors.destructive} />}
            title={t('payment.failed')}
            action={
              <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>
                {pending ? <Button label={t('payment.retry')} onPress={retry} /> : null}
                <Button label={t('payment.cancel')} variant="outline" onPress={close} />
              </View>
            }
          />
        </View>
      ) : (
        <WebView
          key={attempt}
          source={source}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={intercept}
          onNavigationStateChange={(state: WebViewNavigation): void => {
            const result = parsePaymentCallback(state.url);
            if (result) finish(result);
          }}
          startInLoadingState
          renderLoading={(): React.ReactElement => <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          style={{ flex: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.zinc200,
  },
  title: { flex: 1, fontSize: font.base, fontWeight: '700', color: colors.zinc800 },
  center: { flex: 1, justifyContent: 'center', padding: space.xl },
});
