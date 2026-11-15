import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export type Lang = 'en' | 'es';
export const LANGS: Lang[] = ['en', 'es'];

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'es' || fromUrl === 'en') return fromUrl;
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

function syncHtmlLang(lng: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
}
syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export function currentLang(): Lang {
  return i18n.language === 'es' ? 'es' : 'en';
}

export default i18n;
