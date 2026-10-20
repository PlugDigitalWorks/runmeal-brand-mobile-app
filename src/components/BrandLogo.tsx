import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BRAND, BRAND_LOGO } from '@brand';
import { colors } from '@/theme';

/** The brand's logo in a round badge, as the cafe logo sits in brandfe's header. */
export function BrandLogo() {
  return (
    <View style={styles.badge} accessibilityRole="image" accessibilityLabel={BRAND.name}>
      <Image source={BRAND_LOGO} style={styles.logo} contentFit="contain" />
    </View>
  );
}

/** The brand's wordmark on its own, for the sign-in and error screens. */
export function BrandWordmark({ height = 32 }: { height?: number }) {
  return <Image source={BRAND_LOGO} style={{ height, width: height * 3.7 }} contentFit="contain" contentPosition="left" accessibilityLabel={BRAND.name} />;
}

const styles = StyleSheet.create({
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.zinc100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 36, height: 14 },
});
