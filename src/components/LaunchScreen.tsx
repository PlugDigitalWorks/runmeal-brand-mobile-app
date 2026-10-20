import { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BRAND, BRAND_SPLASH } from '@brand';
import { useBrand } from '@/context/BrandContext';
import { useStorefront } from '@/context/StorefrontContext';
import { LAUNCH_MAX_MS, launchSettled } from '@/lib/launch';

const PULSE = { duration: 750, easing: Easing.inOut(Easing.quad) };

// An explicit box at the native splash's size: the image is fitted inside it,
// so it can never draw at the file's own pixel size. The ratio comes from the
// image itself, so another brand's logo keeps its shape.
const SPLASH = Image.resolveAssetSource(BRAND_SPLASH);
const LOGO_WIDTH = BRAND.splashLogoWidth;
const LOGO_HEIGHT = SPLASH?.width && SPLASH?.height ? Math.round((LOGO_WIDTH * SPLASH.height) / SPLASH.width) : LOGO_WIDTH;

/**
 * Takes over from the native splash with the same logo in the same place, and
 * lets it breathe while the brand, branches and menu load, then fades out.
 */
export function LaunchScreen() {
  const { ready, failed } = useBrand();
  const { branchStatus, menuStatus } = useStorefront();
  const reduceMotion = useReducedMotion();
  const [timedOut, setTimedOut] = useState(false);
  const [gone, setGone] = useState(false);
  const settled = timedOut || launchSettled({ brandReady: ready, brandFailed: failed, branchStatus, menuStatus });

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), LAUNCH_MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(withSequence(withTiming(1.08, PULSE), withTiming(1, PULSE)), -1);
    return () => cancelAnimation(scale);
  }, [reduceMotion, scale]);

  useEffect(() => {
    if (!settled) return;
    opacity.value = withTiming(0, { duration: 280 });
    const timer = setTimeout(() => setGone(true), 320);
    return () => clearTimeout(timer);
  }, [settled, opacity]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (gone) return null;
  return (
    <Animated.View
      style={[styles.screen, screenStyle]}
      pointerEvents={settled ? 'none' : 'auto'}
      // The native splash draws the same logo; hide it once this one is on screen.
      onLayout={() => SplashScreen.hideAsync().catch(() => undefined)}
      accessibilityLabel={BRAND.name}
    >
      <Animated.View style={[styles.logo, logoStyle]}>
        <Image source={BRAND_SPLASH} style={styles.logoImage} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.colors.splashBackground,
    zIndex: 1000,
  },
  logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
  logoImage: { width: '100%', height: '100%' },
});
