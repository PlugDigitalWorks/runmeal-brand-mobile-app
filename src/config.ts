export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.runmeal.com';

/**
 * Public reCAPTCHA v2 site key, the same one brandfe renders on every storefront
 * (NEXT_PUBLIC_RECAPTCHA_SITE_KEY). Production login requires its token.
 */
export const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '6LcI-r4tAAAAACBuj3v6pG8RBJmXW2RA132gGjJI';

/**
 * runmeal-api checks a Google ID token's audience against its own GOOGLE_CLIENT_ID,
 * which differs between staging and production; the app asks Google for a token
 * issued to the web client of the API it talks to.
 */
const GOOGLE_WEB_CLIENT_IDS = {
  production: '709162763845-204l0a59busg4vglg9uv24aphlaq9j7r.apps.googleusercontent.com',
  staging: '709162763845-i8m3ql8e9a32kmrntm4gibru2kr6hktm.apps.googleusercontent.com',
};
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  (new URL(API_URL).hostname.startsWith('staging-') ? GOOGLE_WEB_CLIENT_IDS.staging : GOOGLE_WEB_CLIENT_IDS.production);
