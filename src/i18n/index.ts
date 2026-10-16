import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import tr from './locales/tr.json';
import en from './locales/en.json';

const deviceLanguage = getLocales()[0]?.languageCode;

i18n.use(initReactI18next).init({
  resources: { tr: { common: tr }, en: { common: en } },
  lng: deviceLanguage === 'tr' ? 'tr' : 'en',
  fallbackLng: 'tr',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
