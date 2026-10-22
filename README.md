# Runmeal brand mobile app

The mobile storefront for one Runmeal brand, currently **Dharma Coffee**. It
is the multi-cafe `brand-mobile-app` with the cafe picker removed: the app opens
straight into its brand's menu, cart, checkout, orders and loyalty card, against
the same Runmeal API as the brand's website.

Expo SDK 58, Expo Router, React Native. Production API: `https://api.runmeal.com`
(override with `EXPO_PUBLIC_API_URL`).

## Rebranding

Everything that makes this app one brand's app lives in `brand/`:

| File | What it sets |
| --- | --- |
| `brand/brand.json` | Display name, Expo slug, URL scheme, language (`lang`: `en` or `tr`), EAS project ID (`easProjectId`, for push), iOS bundle ID, Android package, Apple Developer team ID (`appleTeamId`), the brand's web `host`, the `linkHosts` whose links and table QR codes the app opens, the colors, and which sign-in options are on (`signIn.apple`: Sign in with Apple on iOS, through `POST /auth/apple/native`) |
| `brand/assets/icon.png` | App icon, 1024×1024, opaque |
| `brand/assets/adaptive-icon.png` | Android adaptive icon foreground, 1024×1024, transparent, artwork inside the middle 66% |
| `brand/assets/splash-icon.png` | Splash screen image, transparent; shown `splashLogoWidth` points wide, and pulses while the app loads |
| `brand/assets/logo.png` | Wordmark used in the header, on the sign-in screen and as the product image placeholder |
| `brand/assets/favicon.png` | Web favicon |

To make the app for another brand:

1. Edit `brand/brand.json`.
   - `host` is the brand's active web domain: its custom domain when one is live, otherwise `{slug}.runmeal.com`. The app finds the brand by sending this host as `Origin` to `GET /brands/resolve`, like the website does.
   - `linkHosts` lists the domains printed on its table QR codes.
   - `bundleIdentifier` and `androidPackage` cannot change after the first store release.
2. Replace the images in `brand/assets`, keeping the file names and sizes.
3. Run `npm run check:brand`. It confirms that `host` and every `linkHosts` entry resolve to the same live brand.
4. Run `npx expo prebuild --clean` so the native projects pick up the new name, icons and identifiers.

No other file names the brand.

## Develop

```bash
npm ci
npx expo run:ios       # or: npx expo run:android
npx jest
npx tsc --noEmit
npx expo lint
```

To run on your own iPhone with a free (personal) Apple team, which cannot sign
Universal Links or Sign in with Apple, generate the iOS project without them:

```bash
PERSONAL_TEAM=1 npx expo prebuild -p ios --clean
```

Run a plain `npx expo prebuild -p ios --clean` again before a store build.

## Push notifications

Order updates and "My notifications" use Expo push: the API sends to Expo's
push service, which hands iPhones to APNs and Android phones to FCM. Per brand:

1. Create or pick the brand's project on expo.dev and put its owner, slug and
   ID in `brand/brand.json` (`easOwner`, `easSlug`, `easProjectId`). Without
   the ID the app never asks for a push token.
2. iOS: `npx eas-cli credentials` → iOS → Push Notifications, to create or
   upload the team's APNs key.
3. Android: add an Android app with the brand's package to a Firebase project,
   save its `google-services.json` in `brand/`, set `googleServicesFile` in
   `brand/brand.json` to `./brand/google-services.json`, and upload an FCM V1
   service account key with `npx eas-cli credentials` → Android.
4. If the Expo project turns on "Enhanced Security for Push Notifications",
   hand its access token to the backend team through the password manager,
   never in chat or email.

Push only works on a real phone; simulators skip registration.

## Play upload key

Google Play builds are signed with the brand's upload key; Play re-signs them
with the app signing key it keeps. The key never goes in this repo. Its
location and passwords live in `~/.gradle/gradle.properties`, under names made
from the brand slug (`dharma-coffee` → `DHARMA_COFFEE_UPLOAD_*`):

```properties
DHARMA_COFFEE_UPLOAD_STORE_FILE=/Users/you/.android-keys/dharma-coffee-upload.jks
DHARMA_COFFEE_UPLOAD_KEY_ALIAS=upload
DHARMA_COFFEE_UPLOAD_STORE_PASSWORD=…
DHARMA_COFFEE_UPLOAD_KEY_PASSWORD=…
```

With those set, a release build is ready for Play:

```bash
npx expo prebuild -p android
cd android && ./gradlew bundleRelease   # android/app/build/outputs/bundle/release/app-release.aab
```

Without them, release builds fall back to the debug key: fine for test APKs,
refused by Play. Raise `android.versionCode` in `app.config.ts` for every upload.
Keep a copy of the `.jks` and its password in the team's password manager; a
lost upload key can only be reset through Play support.

## Backend

The app only uses existing endpoints. What the backend would need for a store
release (mobile sign-in without a web reCAPTCHA, longer sessions, native
Google/Apple sign-in, the payment return target, Universal Links files) is in
`docs/BACKEND_REQUIREMENTS.md`.
