import type { ExpoConfig } from 'expo/config';
import brand from './brand/brand.json';

// A free (personal) Apple team cannot sign the Associated Domains capability, so a
// build for a personal iPhone sets NO_ASSOCIATED_DOMAINS=1. Store builds keep it.
const associatedDomains = process.env.NO_ASSOCIATED_DOMAINS === '1' ? undefined : brand.linkHosts.map((host) => `applinks:${host}`);

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
    supportsTablet: false,
    associatedDomains,
  },
  android: {
    package: brand.androidPackage,
    adaptiveIcon: {
      backgroundColor: brand.colors.iconBackground,
      foregroundImage: './brand/assets/adaptive-icon.png',
    },
    predictiveBackGestureEnabled: false,
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
    [
      'expo-splash-screen',
      {
        backgroundColor: brand.colors.splashBackground,
        image: './brand/assets/splash-icon.png',
        imageWidth: brand.splashLogoWidth,
      },
    ],
    [
      'expo-location',
      { locationWhenInUsePermission: 'We use your location to show the branch nearest to you.' },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Camera access lets you scan the QR code on your table.',
        recordAudioAndroid: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
