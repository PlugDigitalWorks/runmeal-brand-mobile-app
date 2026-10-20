import config from './brand.json';

/**
 * Everything that makes this app one brand's app. To ship it for another
 * brand, change brand.json and replace the images in brand/assets (see
 * README "Rebranding"); no other file names the brand.
 */
export type BrandConfig = typeof config;

export const BRAND: BrandConfig = config;

/** The brand's wordmark, shown in the header and on the sign-in screen. */
export const BRAND_LOGO = require('./assets/logo.png');
