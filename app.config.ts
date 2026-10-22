import type { ExpoConfig } from 'expo/config';
import { withAppBuildGradle, withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';
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
  // The EAS project's slug and owner when the brand has one (push, builds), else the brand's own slug.
  slug: brand.easSlug || brand.slug,
  owner: brand.easOwner || undefined,
  scheme: brand.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './brand/assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: brand.bundleIdentifier,
    // Raise for every TestFlight / App Store upload of the same version.
    buildNumber: '2',
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
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: brand.colors.iconBackground,
      foregroundImage: './brand/assets/adaptive-icon.png',
    },
    predictiveBackGestureEnabled: false,
    // Expo push reaches Android through FCM, which needs the brand's Firebase app file (README "Push notifications").
    googleServicesFile: brand.googleServicesFile || undefined,
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
  // Expo push tokens are issued per EAS project; empty until `eas init` links this brand's project.
  extra: brand.easProjectId ? { eas: { projectId: brand.easProjectId } } : undefined,
  plugins: [
    'expo-router',
    ['@react-native-google-signin/google-signin', { iosUrlScheme: brand.google.iosUrlScheme }],
    // Order updates arrive on Android's "default" channel, created at launch with high importance.
    ['expo-notifications', { defaultChannel: 'default' }],
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

/** A free Apple team cannot sign push notifications either; a personal-team build goes without. */
const withoutPush: ConfigPlugin = (base) =>
  withEntitlementsPlist(base, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });

// Gradle properties naming this brand's Play upload key, e.g. DHARMA_COFFEE_UPLOAD_STORE_FILE.
const signingPrefix = `${brand.slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_UPLOAD`;

/**
 * Signs release builds with the brand's Play upload key when ~/.gradle/gradle.properties
 * names it (see README "Play upload key"); otherwise release builds keep the debug key,
 * which is fine for test APKs and refused by Play.
 */
const withReleaseSigning: ConfigPlugin = (base) =>
  withAppBuildGradle(base, (mod) => {
    const p = signingPrefix;
    mod.modResults.contents = mod.modResults.contents
      .replace(
        /signingConfigs \{\n/,
        `signingConfigs {
        release {
            if (findProperty('${p}_STORE_FILE')) {
                storeFile file(findProperty('${p}_STORE_FILE'))
                storePassword findProperty('${p}_STORE_PASSWORD')
                keyAlias findProperty('${p}_KEY_ALIAS')
                keyPassword findProperty('${p}_KEY_PASSWORD')
            }
        }
`,
      )
      .replace(
        /(release \{\n\s*\/\/ Caution![^\n]*\n[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
        `$1signingConfig findProperty('${p}_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
      );
    return mod;
  });

const withPlatformTweaks: ConfigPlugin = (base) => {
  const signedIn = usesAppleSignIn ? base : withoutAppleSignIn(base);
  return withReleaseSigning(personalTeam ? withoutPush(signedIn) : signedIn);
};

export default withPlatformTweaks(config);
