import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
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
      <Animated.Image source={BRAND_SPLASH} style={[styles.logo, logoStyle]} resizeMode="contain" />
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
  logo: { width: BRAND.splashLogoWidth, aspectRatio: 1200 / 323 },
});
