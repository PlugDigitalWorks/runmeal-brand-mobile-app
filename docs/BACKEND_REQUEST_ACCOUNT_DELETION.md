# Backend request: delete my account

**For:** runmeal-api team
**From:** runmeal-brand-mobile-app (Dharma Coffee, iOS `uk.dharmacoffee.ios`, Android `uk.dharmacoffee.app`)
**Status:** requested. The app's "Delete account" screen is built against this contract and mocked in tests. It cannot ship to the stores until the endpoint is live.

## Why

Both stores reject an app that lets people create an account but not delete it:

- **App Store guideline 5.1.1(v):** apps that support account creation must let users start account deletion inside the app. Apps that offer Sign in with Apple must also revoke the user's Apple tokens when the account is deleted.
- **Google Play User Data policy:** account deletion must be available in the app, and through a web link that is entered in Play Console's Data safety form. That link must work without installing the app.

Today runmeal-api has `GET /profile`, but nothing that deletes a user.

## 1. `DELETE /profile`

Authenticated with the normal access token (`JwtAuthGuard`). No body. It deletes the caller's own account only and takes no user ID.

**Response:** `200 { "status": true, "message": "...", "data": null }`. After this, the access and refresh tokens are dead.

**What it does, in one transaction where possible:**

1. **Apple:** call the existing `AuthService.revokeAppleGrant(userId)` (it is best effort and already handles a missing `appleRefreshToken`).
2. **Sessions:** `SessionService.revokeAllSessions(userId)`.
3. **Personal data:** delete or anonymise the user row. Clear `email`, `firstName`, `lastName`, `phone`, `passwordHash`, `googleSub`, `appleSub`, `appleRefreshToken`, and anything else that identifies the person.
   - If other tables reference the user and must survive (orders), keep the row with these fields nulled or replaced (for example `deleted-<id>@invalid`) and set `deletedAt`. Make sure the email is free to register again.
4. **Addresses:** delete the user's rows in the addresses table.
5. **Loyalty:** delete stamp balances and member QR data, and void Apple/Google Wallet passes where the pass services allow it.
6. **Carts and saved payment cards:** delete open carts. Delete stored card tokens at the payment provider (iyzico / Stripe customer), if any are stored.
7. **Orders:** keep them for accounting and tax, detached from personal data (name, phone, delivery address text) where the law allows.

**Who:** customers (`role` user) only. For staff or brand-owner roles, return a new `ACCOUNT_DELETE_NOT_ALLOWED` (403), so a dashboard account cannot be removed from a phone by mistake.

**Errors** (codes in `src/common/errors/error-codes.ts`, with copy in the dashboard's `en.json` and `tr.json`):

| Code | Status | When |
| --- | --- | --- |
| `ACCOUNT_DELETE_NOT_ALLOWED` | 403 | the caller is not a customer |
| existing unauthorized code | 401 | no or expired token |

An active order (not yet completed or cancelled) may block deletion with `ACCOUNT_DELETE_ACTIVE_ORDER` (409), if the team prefers. The app shows the API's message either way.

## 2. A web page for Google Play

Play Console asks for a URL where people can request deletion without the app. Either:

- A page on the brand site (brandfe), for example `/account/delete`, that signs the user in and calls `DELETE /profile`; or
- A static page that explains how to delete in the app and gives a support email that handles requests.

This is brandfe work, so it is listed here only so it is not forgotten.

## 3. Privacy policy and terms pages

The app links to these two URLs from the Account tab, and App Store Connect and Play Console need the privacy URL as well:

- `https://order.dharmacoffee.uk/pages/privacy-policy`
- `https://order.dharmacoffee.uk/pages/terms`

Both are CMS content pages. Today both return `CONTENT_PAGE_NOT_FOUND` for Dharma. They have to be created in the dashboard CMS with the slugs `privacy-policy` and `terms`. The privacy policy must name the data collected (account, addresses, location for branch sorting, orders, loyalty) and how to delete it.

## What the app does

- **Account → Delete account** (members only) opens a screen that lists what is deleted, asks once more, then calls `DELETE /profile`.
- On success, the app clears its stored tokens and shows "Account deleted".
- On failure, it shows the API's message and keeps the user signed in.
