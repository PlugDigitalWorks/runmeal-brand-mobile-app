import type { ExpoConfig } from 'expo/config';

const LINK_DOMAIN = process.env.EXPO_PUBLIC_LINK_BASE_DOMAIN ?? 'runmeal.com';
const linkHost = `*.${LINK_DOMAIN}`;

// Paths the app opens once the web side serves the link verification files.
const androidLinkData = [
  { scheme: 'https', host: linkHost, path: '/' },
  { scheme: 'https', host: linkHost, path: '/order' },
  { scheme: 'https', host: linkHost, pathPrefix: '/pages/' },
  { scheme: 'https', host: linkHost, pathPrefix: '/rewards' },
];

const config: ExpoConfig = {
  name: 'Runmeal',
  slug: 'runmeal',
  scheme: 'runmeal',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.runmeal.app',
    supportsTablet: false,
    associatedDomains: [`applinks:${linkHost}`],
  },
  android: {
    package: 'com.runmeal.app',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/icon.png',
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
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Masadaki QR kodu okutmak için kameraya erişim gerekiyor.',
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
