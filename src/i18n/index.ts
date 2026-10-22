import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BRAND } from '@brand';
import en from './locales/en.json';
import tr from './locales/tr.json';

/**
 * The app speaks its brand's language (brand.json `lang`, "en" or "tr"). The
 * Turkish file so far covers notifications and API errors; anything it lacks
 * falls back to English.
 */
i18n.use(initReactI18next).init({
  resources: { en: { common: en }, tr: { common: tr } },
  lng: BRAND.lang === 'tr' ? 'tr' : 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
