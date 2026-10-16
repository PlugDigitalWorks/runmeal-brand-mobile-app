import '@/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BrandProvider } from '@/context/BrandContext';
import { StorefrontProvider } from '@/context/StorefrontContext';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <BrandProvider>
      <StorefrontProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="brands" />
          <Stack.Screen name="link" />
          <Stack.Screen name="order" />
          <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="product/[id]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.92],
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              contentStyle: { backgroundColor: colors.card },
            }}
          />
          <Stack.Screen
            name="branches"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.6, 0.92],
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </Stack>
      </StorefrontProvider>
    </BrandProvider>
  );
}
