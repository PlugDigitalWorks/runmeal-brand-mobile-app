import '@/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { BrandProvider } from '@/context/BrandContext';
import { CartProvider } from '@/context/CartContext';
import { StorefrontProvider } from '@/context/StorefrontContext';
import { TableProvider } from '@/context/TableContext';
import { colors } from '@/theme';

const sheet = {
  presentation: 'formSheet' as const,
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
};

export default function RootLayout() {
  return (
    <BrandProvider>
      <AuthProvider>
        <StorefrontProvider>
          <TableProvider>
            <CartProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="brands" />
                <Stack.Screen name="link" />
                <Stack.Screen name="order" />
                <Stack.Screen name="checkout" />
                <Stack.Screen name="payment" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
                <Stack.Screen name="orders/index" />
                <Stack.Screen name="orders/[id]" />
                <Stack.Screen name="address-new" options={{ presentation: 'modal' }} />
                <Stack.Screen name="login" options={{ presentation: 'modal' }} />
                <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
                <Stack.Screen name="rewards" options={{ presentation: 'modal' }} />
                <Stack.Screen
                  name="product/[id]"
                  options={{ ...sheet, sheetAllowedDetents: [0.92], contentStyle: { backgroundColor: colors.card } }}
                />
                <Stack.Screen
                  name="branches"
                  options={{ ...sheet, sheetAllowedDetents: [0.6, 0.92], contentStyle: { backgroundColor: colors.background } }}
                />
              </Stack>
            </CartProvider>
          </TableProvider>
        </StorefrontProvider>
      </AuthProvider>
    </BrandProvider>
  );
}
