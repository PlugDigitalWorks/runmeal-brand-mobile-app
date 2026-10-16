import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import tr from './locales/tr.json';
import en from './locales/en.json';

/** Set only when the user picks a language (brandfe's runmeal_lang_choice). */
const LANGUAGE_KEY = 'rm_lang_choice';
const SUPPORTED = ['tr', 'en'] as const;

const deviceLanguage = getLocales()[0]?.languageCode;

i18n.use(initReactI18next).init({
  resources: { tr: { common: tr }, en: { common: en } },
  lng: deviceLanguage === 'tr' ? 'tr' : 'en',
  fallbackLng: 'tr',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

AsyncStorage.getItem(LANGUAGE_KEY)
  .then((stored) => {
    if (stored && (SUPPORTED as readonly string[]).includes(stored) && stored !== i18n.language) {
      i18n.changeLanguage(stored);
    }
  })
  .catch(() => {});

export async function chooseLanguage(language: (typeof SUPPORTED)[number]): Promise<void> {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export default i18n;
