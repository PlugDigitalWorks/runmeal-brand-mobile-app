# Backend request: native Google and Apple sign-in for the mobile app

**For:** runmeal-api team
**From:** runmeal-brand-mobile-app (the single-brand app, today Dharma Coffee, bundle `uk.dharmacoffee.app`)
**Status:** requested; the app side will be built against this contract and mocked in tests until the endpoints ship.

## Why the existing Google flow does not work in the app

`POST /auth/login { method: 'google' }` returns a Google authorize URL. After consent, `GET /auth/google/callback` redirects to `{frontendUrl}/login?auth=success&handoff=…`, where `frontendUrl` is the brand's web origin (`startGoogleLogin` in `src/auth/auth.service.ts`). The handoff is then redeemed with `POST /auth/google/exchange`.

A phone app cannot use this flow today:

- Google blocks sign-in inside embedded WebViews, so consent has to happen in the system browser.
- The system browser hands control back to the app only through a custom URL scheme, or through an `https` link that the app owns via Universal Links / App Links. The return address here is the brand's website, and no Universal Links files are served there.

Native sign-in avoids the redirect. The phone's own Google and Apple sheets hand the app a signed identity token, and the app sends that token to the API in one request.

App Store guideline 4.8 also requires Sign in with Apple in any iOS app that offers Google sign-in, so the two endpoints ship together.

## 1. `POST /auth/google/native`

Public. No reCAPTCHA: the Google ID token is the proof. Apply the same rate limit as `/auth/login`.

**Request** (same headers the app already sends: `x-device-id`, `x-auth-mode: body`)

```json
{
  "idToken": "<Google ID token (JWT)>",
  "client": "user"
}
```

**Verify**

- Use `OAuth2Client.verifyIdToken`, the same call `completeGoogleLogin` already makes.
- `audience` must be `GOOGLE_CLIENT_ID`, the existing web client. The app passes that web client ID to the Google SDK on both iOS and Android, so the token's `aud` is the web client.
- Optionally, check that `azp` is one of the app's own client IDs, listed in a new env var `GOOGLE_NATIVE_CLIENT_IDS` (comma-separated).
- Keep the checks `completeGoogleLogin` already has: issuer in `GOOGLE_VALID_ISSUERS`, `email_verified === true`, `sub` and `email` present.

**Account**

Same rules as `completeGoogleLogin`:

- Find the user by `googleSub`, otherwise by `email`.
- If neither matches, create the user with `given_name` and `family_name`, `isEmailVerified: true` and `googleSub`.
- If the user exists without a `googleSub`, link it.
- If the stored `googleSub` is different, fail with `AUTH_GOOGLE_ACCOUNT_MISMATCH`.
- Respect `isClientBlockedForRole`.

Ideally both flows share one function, so the web flow and this endpoint cannot drift apart.

**Response** — identical to `POST /auth/verify-otp` in body mode, from `createSessionAndTokens`:

```json
{ "status": true, "message": "...", "data": { "accessToken": "...", "refreshToken": "...", "sid": "...", "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "fullName": "...", "role": "..." } } }
```

**Errors:** reuse `AUTH_GOOGLE_VERIFICATION_FAILED` (401) and `AUTH_GOOGLE_ACCOUNT_MISMATCH` (401), plus the existing blocked-role error.

## 2. `POST /auth/apple`

Same shape, for Sign in with Apple.

**Request**

```json
{
  "identityToken": "<Apple identity token (JWT)>",
  "authorizationCode": "<Apple authorization code>",
  "nonce": "<raw nonce the app generated>",
  "firstName": "Gökhan",
  "lastName": "Çalışkan",
  "client": "user"
}
```

- `firstName` and `lastName` are optional. Apple sends the name only on the first authorization, so the app passes it through and the API stores it when it creates the user.
- `authorizationCode` is needed to revoke the Apple token when the account is deleted (see "Account deletion" below).

**Verify** the identity token:

- RS256 signature against Apple's keys at `https://appleid.apple.com/auth/keys` (cache them by `kid`).
- `iss` is `https://appleid.apple.com`.
- `aud` is one of the app bundle IDs in a new env var `APPLE_CLIENT_IDS` (comma-separated; today `uk.dharmacoffee.app`, and each future single-brand app adds its own).
- `exp` is in the future.
- `nonce` claim equals `sha256(nonce)` from the request, hex-encoded.

**Account**

- Find the user by a new `appleSub` column (the token's `sub`).
- Otherwise find by `email` when the token has `email_verified` true and the address is not an `@privaterelay.appleid.com` relay address.
- If neither matches, create the user. With "Hide My Email" the relay address is the user's email, and it still receives mail.
- Link `appleSub` to an existing user that has none.
- A different stored `appleSub` fails with a new `AUTH_APPLE_ACCOUNT_MISMATCH`.
- Respect `isClientBlockedForRole`.

**Response:** same as section 1.

**Errors:** new `AUTH_APPLE_VERIFICATION_FAILED` (401) and `AUTH_APPLE_ACCOUNT_MISMATCH` (401).

**Account deletion:** App Store guideline 5.1.1(v) requires in-app account deletion, and Apple requires revoking the user's Sign in with Apple token when the account is deleted. To make that possible:

- Exchange `authorizationCode` at `https://appleid.apple.com/auth/token` for a refresh token and store it.
- Call `https://appleid.apple.com/auth/revoke` when the account is deleted.

Both calls need a client secret JWT signed with the team's Sign in with Apple key (`.p8`), passed as env vars: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`.

## Configuration outside the code

| Where | What |
| --- | --- |
| Google Cloud Console (the project that owns `GOOGLE_CLIENT_ID`) | An iOS OAuth client for bundle ID `uk.dharmacoffee.app`, and an Android OAuth client for package `uk.dharmacoffee.app`. Android needs the SHA-1 of the signing key. Today's test APKs use the standard React Native debug key, SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (testing only); add Play App Signing's SHA-1 once the app is on Play. The app needs the iOS client ID and its reversed URL scheme. |
| Apple Developer (paid team) | App ID `uk.dharmacoffee.app` with the Sign in with Apple capability. A Sign in with Apple key (`.p8`) for the token exchange and revoke. |
| runmeal-api env | `GOOGLE_NATIVE_CLIENT_IDS` (optional), `APPLE_CLIENT_IDS`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` |

## What the app will do

- **iOS:** the sign-in screen shows "Sign in with Apple" (Apple's own button) and "Continue with Google".
- **Android:** only Google.
- Both use the native SDKs (`expo-apple-authentication`, `@react-native-google-signin/google-signin`). The token is posted to the endpoint above, and the response is stored like an email-code sign-in: tokens in the Keychain/Keystore, silent refresh, no second sign-in.
- Each button is switched on per brand in `brand/brand.json` once its endpoint is live.
