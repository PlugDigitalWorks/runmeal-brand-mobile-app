import '@/i18n';
import { Stack } from 'expo-router';
import { BrandProvider } from '@/context/BrandContext';

export default function RootLayout() {
  return (
    <BrandProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="brands" />
        <Stack.Screen name="link" />
        <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(brand)" />
      </Stack>
    </BrandProvider>
  );
}
