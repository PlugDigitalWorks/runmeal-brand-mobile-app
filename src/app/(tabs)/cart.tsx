import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react-native';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, font, space } from '@/theme';

/** Part 2 fills this with the backend cart; for now it is the empty state. */
export default function CartScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{t('tabs.cart')}</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon={<ShoppingCart size={40} color={colors.primary} />}
          tone="brand"
          title={t('cart.emptyTitle')}
          body={t('cart.emptyBody')}
          action={<Button label={t('cart.goToMenu')} onPress={() => router.navigate('/menu')} style={{ marginTop: 8, alignSelf: 'stretch' }} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.lg },
  title: { fontSize: font.display, fontWeight: '800', color: colors.zinc900, letterSpacing: -0.5 },
});
