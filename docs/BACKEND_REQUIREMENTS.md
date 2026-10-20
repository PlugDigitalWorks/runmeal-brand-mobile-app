# Backend requirements for the Runmeal mobile app

The app was built without touching `runmeal-api` or `runmeal-brand-fe-website`. Everything below works today through the workaround described in each item; the backend change is what makes it robust for a store release. File references are to `runmeal-api` on `origin/staging`.

## 1. Mobile sign-in without a web reCAPTCHA

- **What:** let the app call `POST /auth/login` (`method: 'otp' | 'password'`) without a browser reCAPTCHA token, using a mobile-grade check instead: App Attest (iOS) / Play Integrity (Android), or reCAPTCHA Enterprise mobile keys.
- **Why:** production rejects `/auth/login` without `recaptchaToken` (`src/auth/auth.service.ts` around line 584, `src/common/services/recaptcha.service.ts`). The app renders brandfe's v2 widget in a WebView whose base URL is the cafe's host (`src/components/Recaptcha.tsx`). That works because the site key already allows the cafe domains, but every new custom domain must be added to the key, and Google can tighten WebView checks at any time.
- **Endpoint:** `POST /auth/login`; add an accepted attestation field (for example `deviceAttestation`) as an alternative to `recaptchaToken` for `client: 'user'` requests from the app.

## 2. Long-lived mobile sessions ("sign in once")

- **What:** a mobile session policy: a `client: 'mobile'` value (or a header) whose refresh token lives much longer than the web's (for example 180 days, sliding) and is bound to `x-device-id`.
- **Why:** the app keeps tokens in the Keychain/Keystore and refreshes silently (`src/lib/session.ts`, `src/lib/api.ts`). Today `JWT_REFRESH_EXPIRES_IN` defaults to `30d` (`src/auth/session.service.ts` `refreshTtlDays`), renewed on every refresh, so a customer who doesn't open the app for 30 days must sign in again. `x-device-id` is stored but not checked on refresh (`rotateRefreshToken`).
- **Endpoints:** `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/refresh` (`LoginClient` in `src/auth/dto/login.dto.ts`, `RefreshDto`).

## 3. Native Google and Apple sign-in

- **What:** `POST /auth/google/native { idToken, client }` and `POST /auth/apple { identityToken, authorizationCode, nonce, firstName?, lastName?, client }`, both answering like `POST /auth/verify-otp`. The full contract, account rules, errors and console setup are in [BACKEND_REQUEST_SOCIAL_SIGN_IN.md](BACKEND_REQUEST_SOCIAL_SIGN_IN.md).
- **Why:** the web Google flow returns to the brand's website (`{origin}/login?auth=success&handoff=…`), which the app can only catch once Universal Links are live (item 6), and Google blocks sign-in inside embedded WebViews. App Store guideline 4.8 requires Sign in with Apple whenever Google sign-in is offered. Until both endpoints ship, the app signs in with an emailed code or a password.

## 4. Payment return target for the app

- **What:** accept an explicit return target for app payments (for example `returnUrl: 'dharmacoffee://payment'`, allowlisted per client), and validate the `Origin`-based return against the brand's own domains.
- **Why:** the final redirect is built from the raw request `Origin` (`src/payments/helpers/frontend-base-url.ts`, `payments.controller.ts`). The app sends `Origin: https://{cafe host}` on `POST /payments/initialize` and intercepts `/payment/callback` inside its payment WebView (`src/app/payment.tsx`). That needs the provider page to stay in the WebView; a bank app switch during 3-D Secure returns to the browser instead. Taking `Origin` unvalidated is also an open-redirect surface.
- **Endpoints:** `POST /payments/initialize`, `POST /customer/table-checks/payments/initialize`.

## 5. Explicit delivery address on checkout

- **What:** an `addressId` field on `POST /payments/initialize`.
- **Why:** delivery uses the customer's *active* address implicitly, so the app first calls `PATCH /addresses/:id/set-active` and then initializes payment (`src/app/checkout.tsx`). Two devices checking out at once can race on the active address.

## 6. Universal Links / App Links files (web or domain-router Worker, not the API)

- **What:** serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on every host in `brand/brand.json` `linkHosts` (today `order.dharmacoffee.uk`), listing app id `<TeamID>.uk.dharmacoffee.app` / package `uk.dharmacoffee.app` and the paths `/`, `/order`, `/pages/*`, `/rewards*`.
- **Why:** the app is configured for `applinks:` on those hosts and the matching Android intent filters (`app.config.ts`, built from `brand/brand.json`), and routes every incoming link through `src/app/+native-intent.tsx`. Without these files the phone camera opens table QR codes in the browser; the app's own scanner (middle tab) works regardless.
- **Also:** when a custom domain goes live, the default `{slug}.runmeal.com` row is set INACTIVE (`brand-domain.service.ts` around line 472), so QR codes printed on the old host stop resolving; `npm run check:brand` flags such a host in `linkHosts`.

## 7. Customer push notifications for order status

- **What:** an endpoint to register an Expo/APNs/FCM device token for the signed-in customer (for example `POST /customer/devices`) and pushes on order status changes.
- **Why:** there is no customer device-token storage; the only realtime channel is the managers' SSE stream (`src/notifications/notifications.service.ts`). The app's order screen refreshes on pull and on focus.

## 8. Email links that do not depend on Origin

- **What:** build verification and password-reset links from the brand's own domain, not the request `Origin`.
- **Why:** without an `Origin` they fall back to `http://localhost:3000` (`src/mail/mail.service.ts` around lines 149 and 226). The app signs up with an emailed code, so it does not hit this today, but any future password reset from the app would.
