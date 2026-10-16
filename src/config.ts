export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.runmeal.com';
export const LINK_BASE_DOMAIN = process.env.EXPO_PUBLIC_LINK_BASE_DOMAIN ?? 'runmeal.com';

/**
 * Public reCAPTCHA v2 site key, the same one brandfe renders on every storefront
 * (NEXT_PUBLIC_RECAPTCHA_SITE_KEY). Production login requires its token.
 */
export const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '6LcI-r4tAAAAACBuj3v6pG8RBJmXW2RA132gGjJI';
