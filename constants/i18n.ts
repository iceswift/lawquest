import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en';
import th from './locales/th';

const resources = {
  th: {
    translation: th,
  },
  en: {
    translation: en,
  },
};

const locales = Localization.getLocales();
const deviceLanguage = locales[0]?.languageCode?.split('-')[0] ?? 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage === 'th' ? 'th' : 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;
