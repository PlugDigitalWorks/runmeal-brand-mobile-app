import type { ExpoConfig } from 'expo/config';
import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';
import brand from './brand/brand.json';

// A free (personal) Apple team cannot sign Associated Domains or Sign in with Apple,
// so a build for a personal iPhone sets PERSONAL_TEAM=1. Store builds keep both.
const personalTeam = process.env.PERSONAL_TEAM === '1';
const associatedDomains = personalTeam ? undefined : brand.linkHosts.map((host) => `applinks:${host}`);
// The app shows the Apple button only when this capability is in the build.
const usesAppleSignIn = brand.signIn.apple && !personalTeam;

// Paths the app opens once the brand's web host serves the link verification files.
const androidLinkData = brand.linkHosts.flatMap((host) => [
  { scheme: 'https', host, path: '/' },
  { scheme: 'https', host, path: '/order' },
  { scheme: 'https', host, pathPrefix: '/pages/' },
  { scheme: 'https', host, pathPrefix: '/rewards' },
]);

/** Everything brand-specific comes from brand/brand.json and brand/assets. */
const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './brand/assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: brand.bundleIdentifier,
    // Raise for every TestFlight / App Store upload of the same version.
    buildNumber: '1',
    // Only HTTPS and the OS's own crypto: no export compliance questions on each upload.
    config: { usesNonExemptEncryption: false },
    // The paid team that signs store and TestFlight builds; a personal-team build picks its own in Xcode.
    appleTeamId: personalTeam ? undefined : brand.appleTeamId,
    supportsTablet: false,
    associatedDomains,
    usesAppleSignIn,
  },
  android: {
    package: brand.androidPackage,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: brand.colors.iconBackground,
      foregroundImage: './brand/assets/adaptive-icon.png',
    },
    predictiveBackGestureEnabled: false,
    // Pulled in by libraries but never used; Play asks for a reason for each one it sees.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: androidLinkData,
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './brand/assets/favicon.png',
  },
  plugins: [
    'expo-router',
    ['@react-native-google-signin/google-signin', { iosUrlScheme: brand.google.iosUrlScheme }],
    [
      'expo-splash-screen',
      {
        backgroundColor: brand.colors.splashBackground,
        image: './brand/assets/splash-icon.png',
        imageWidth: brand.splashLogoWidth,
      },
    ],
    // Only "while using the app": App Review rejects purpose strings the app never asks for, or generic ones.
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Your location shows the branch nearest to you and fills in your delivery address. For example, the closest cafe is listed first.',
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        locationFullAccuracyPermission: false,
        motionUsagePermission: false,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'The camera scans the QR code on your table so you can order to that table.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

/**
 * Expo applies expo-apple-authentication's plugin by itself, and that plugin
 * always adds the Sign in with Apple entitlement. Take it out again when this
 * build should not have it, or a free Apple team cannot sign the app.
 */
const withoutAppleSignIn: ConfigPlugin = (base) =>
  withEntitlementsPlist(base, (mod) => {
    delete mod.modResults['com.apple.developer.applesignin'];
    return mod;
  });

export default usesAppleSignIn ? config : withoutAppleSignIn(config);
