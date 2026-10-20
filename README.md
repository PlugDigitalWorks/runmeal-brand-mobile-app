# Single-brand app

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
| `brand/brand.json` | Display name, Expo slug, URL scheme, iOS bundle ID, Android package, the brand's web `host`, the `linkHosts` whose links and table QR codes the app opens, and the colors |
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
Universal Links, generate the iOS project without them:

```bash
NO_ASSOCIATED_DOMAINS=1 npx expo prebuild -p ios --clean
```

Run a plain `npx expo prebuild -p ios --clean` again before a store build.

## Backend

The app only uses existing endpoints. What the backend would need for a store
release (mobile sign-in without a web reCAPTCHA, longer sessions, native
Google/Apple sign-in, the payment return target, Universal Links files) is in
`docs/BACKEND_REQUIREMENTS.md`.
