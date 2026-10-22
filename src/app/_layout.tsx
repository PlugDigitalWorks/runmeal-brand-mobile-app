import '@/i18n';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LaunchScreen } from '@/components/LaunchScreen';
import { AuthProvider } from '@/context/AuthContext';
import { BrandProvider } from '@/context/BrandContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { StorefrontProvider } from '@/context/StorefrontContext';
import { TableProvider } from '@/context/TableContext';
import { colors } from '@/theme';

// The launch screen hides the native splash once it has drawn the same logo over it.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
              <NotificationsProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="link" />
                  <Stack.Screen name="checkout" />
                  <Stack.Screen name="payment" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
                  <Stack.Screen name="orders/index" />
                  <Stack.Screen name="orders/[id]" />
                  <Stack.Screen name="addresses/index" />
                  <Stack.Screen name="addresses/form" options={{ presentation: 'modal' }} />
                  {/* Only as tall as its step, so the buttons sit within thumb reach. */}
                  <Stack.Screen
                    name="login"
                    options={{ ...sheet, sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: colors.card } }}
                  />
                  <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="rewards" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="legal/[page]" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="notifications/index" />
                  <Stack.Screen
                    name="notifications-permission"
                    options={{ ...sheet, sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: colors.card } }}
                  />
                  <Stack.Screen
                    name="product/[id]"
                    options={{ ...sheet, sheetAllowedDetents: [0.92], contentStyle: { backgroundColor: colors.card } }}
                  />
                  <Stack.Screen
                    name="branches"
                    options={{ ...sheet, sheetAllowedDetents: [0.6, 0.92], contentStyle: { backgroundColor: colors.background } }}
                  />
                </Stack>
                <LaunchScreen />
              </NotificationsProvider>
            </CartProvider>
          </TableProvider>
        </StorefrontProvider>
      </AuthProvider>
    </BrandProvider>
  );
}
