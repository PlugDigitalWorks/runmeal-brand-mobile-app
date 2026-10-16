import { Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Tabs, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { House, QrCode, ShoppingCart, User, UtensilsCrossed } from 'lucide-react-native';
import { useBrand } from '@/context/BrandContext';
import { colors, shadow } from '@/theme';

/** Kahve Dünyası / Starbucks style bar: the table QR scanner sits raised in the middle. */
function ScanTabButton() {
  const { t } = useTranslation();
  return (
    <View style={styles.qrSlot}>
      <Pressable
        style={({ pressed }) => [styles.qrButton, pressed && { transform: [{ scale: 0.95 }] }]}
        onPress={() => router.push('/scan')}
        accessibilityRole="button"
        accessibilityLabel={t('tabs.scan')}
      >
        <QrCode size={26} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { brand, ready } = useBrand();
  if (ready && !brand) return <Redirect href="/brands" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.zinc400,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.zinc100 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <House size={22} color={color} /> }} />
      <Tabs.Screen
        name="menu"
        options={{ title: t('tabs.menu'), tabBarIcon: ({ color }) => <UtensilsCrossed size={22} color={color} /> }}
      />
      <Tabs.Screen name="qr" options={{ title: t('tabs.scan'), tabBarButton: () => <ScanTabButton /> }} />
      <Tabs.Screen
        name="cart"
        options={{ title: t('tabs.cart'), tabBarIcon: ({ color }) => <ShoppingCart size={22} color={color} /> }}
      />
      <Tabs.Screen name="account" options={{ title: t('tabs.account'), tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  qrSlot: { flex: 1, alignItems: 'center' },
  qrButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.card,
    ...shadow.raised,
  },
});
