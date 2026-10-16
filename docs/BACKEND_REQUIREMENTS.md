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

- **What:** `POST /auth/google/native` taking a Google `idToken` (verify with `OAuth2Client.verifyIdToken`, already used in `auth.service.ts`, accepting the iOS and Android client ids as audiences) and `POST /auth/apple` taking an Apple identity token. Alternatively, let the existing Google flow redirect to `runmeal://auth?handoff=…` and redeem it with the existing `POST /auth/google/exchange`.
- **Why:** the web Google flow returns to `{origin}/login?auth=success&handoff=…` (`auth.controller.ts` around line 212). Google blocks OAuth inside embedded WebViews, and an `https` callback can only be caught by the app once universal links are live (item 7). App Store guideline 4.8 requires Sign in with Apple whenever Google sign-in is offered, so the app ships with email code and password only.

## 4. Payment return target for the app

- **What:** accept an explicit return target for app payments (for example `returnUrl: 'runmeal://payment'`, allowlisted per client), and validate the `Origin`-based return against the brand's own domains.
- **Why:** the final redirect is built from the raw request `Origin` (`src/payments/helpers/frontend-base-url.ts`, `payments.controller.ts`). The app sends `Origin: https://{cafe host}` on `POST /payments/initialize` and intercepts `/payment/callback` inside its payment WebView (`src/app/payment.tsx`). That needs the provider page to stay in the WebView; a bank app switch during 3-D Secure returns to the browser instead. Taking `Origin` unvalidated is also an open-redirect surface.
- **Endpoints:** `POST /payments/initialize`, `POST /customer/table-checks/payments/initialize`.

## 5. Explicit delivery address on checkout

- **What:** an `addressId` field on `POST /payments/initialize`.
- **Why:** delivery uses the customer's *active* address implicitly, so the app first calls `PATCH /addresses/:id/set-active` and then initializes payment (`src/app/checkout.tsx`). Two devices checking out at once can race on the active address.

## 6. Public brand directory

- **What:** a public `GET /app/brands` (search, paginated) and a host or slug lookup (`GET /app/brands/lookup?host=`) for the app.
- **Why:** there is no public brand list (`GET /brands` is membership-filtered), and `GET /brands/resolve` ignores `?host=` in production (`src/common/services/brand-domain.service.ts` `extractTenantContext`). The app therefore ships its cafe list in `src/data/brands.json` and resolves a cafe by sending its host as `Origin`. A new cafe needs an app update until this exists. Also: when a custom domain goes live, the default `{slug}.runmeal.com` row is set INACTIVE (`brand-domain.service.ts` around line 472), so QR codes printed on the old host stop resolving.

## 7. Universal Links / App Links files (web or domain-router Worker, not the API)

- **What:** serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on every cafe host and on `runmeal.com`, listing app id `<TeamID>.com.runmeal.app` / package `com.runmeal.app` and the paths `/`, `/order`, `/pages/*`, `/rewards*`.
- **Why:** the app is already configured for `applinks:*.runmeal.com` and the matching Android intent filters (`app.config.ts`), and routes every incoming link through `src/app/+native-intent.tsx`. Without these files the phone camera opens table QR codes in the browser; the app's own scanner (middle tab) works regardless.

## 8. Customer push notifications for order status

- **What:** an endpoint to register an Expo/APNs/FCM device token for the signed-in customer (for example `POST /customer/devices`) and pushes on order status changes.
- **Why:** there is no customer device-token storage; the only realtime channel is the managers' SSE stream (`src/notifications/notifications.service.ts`). The app's order screen refreshes on pull and on focus.

## 9. Email links that do not depend on Origin

- **What:** build verification and password-reset links from the brand's own domain, not the request `Origin`.
- **Why:** without an `Origin` they fall back to `http://localhost:3000` (`src/mail/mail.service.ts` around lines 149 and 226). The app signs up with an emailed code, so it does not hit this today, but any future password reset from the app would.
