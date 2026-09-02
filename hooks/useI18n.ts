// i18n utilities for LAK PDF
export type Language = 'en' | 'hi' | 'hinglish';

export interface TranslationValue {
  en: string;
  hi: string;
  hinglish: string;
}

export interface Translations {
  [key: string]: TranslationValue;
}

export const translations: Translations = {
  'nav.home': { en: 'Home', hi: 'Home', hinglish: 'Home' },
  'nav.tools': { en: 'Tools', hi: 'Tools', hinglish: 'Tools' },
  'nav.merge': { en: 'Merge PDF', hi: 'Merge PDF', hinglish: 'Merge PDF' },
  'nav.split': { en: 'Split PDF', hi: 'Split PDF', hinglish: 'Split PDF' },
  'nav.compress': { en: 'Compress PDF', hi: 'Compress PDF', hinglish: 'Compress PDF' },
  'nav.convert': { en: 'Convert PDF', hi: 'Convert PDF', hinglish: 'Convert PDF' },
  'nav.history': { en: 'History', hi: 'History', hinglish: 'History' },
  'nav.profile': { en: 'Profile', hi: 'Profile', hinglish: 'Profile' },
  'action.selectFiles': { en: 'Select Files', hi: 'Select Files', hinglish: 'Select Files' },
  'action.download': { en: 'Download', hi: 'Download', hinglish: 'Download' },
  'action.save': { en: 'Save', hi: 'Save', hinglish: 'Save' },
  'action.cancel': { en: 'Cancel', hi: 'Cancel', hinglish: 'Cancel' },
  'action.login': { en: 'Login', hi: 'Login', hinglish: 'Login' },
  'action.signup': { en: 'Sign Up', hi: 'Sign Up', hinglish: 'Sign Up' },
  'tool.merge.desc': { en: 'Combine multiple PDF files into one', hi: 'Combine multiple PDF files into one', hinglish: 'Multiple PDF files ko ek mein milayein' },
  'tool.split.desc': { en: 'Separate PDF pages into individual files', hi: 'Separate PDF pages into individual files', hinglish: 'Ek page ya puri PDF ko alag-alag files mein baanthein' },
  'tool.compress.desc': { en: 'Reduce PDF file size while maintaining quality', hi: 'Reduce PDF file size while maintaining quality', hinglish: 'Quality maintain karke file size kam karein' },
  'dashboard.recentFiles': { en: 'Recent Files', hi: 'Recent Files', hinglish: 'Recent Files' },
  'dashboard.favorites': { en: 'Favorites', hi: 'Favorites', hinglish: 'Favorites' },
  'dashboard.stats': { en: 'Statistics', hi: 'Statistics', hinglish: 'Statistics' },
  'msg.noFiles': { en: 'No files yet', hi: 'No files yet', hinglish: 'Abhi koi file nahi' },
  'msg.processing': { en: 'Processing...', hi: 'Processing...', hinglish: 'Processing...' },
  'msg.success': { en: 'Success!', hi: 'Success!', hinglish: 'Success!' },
  'msg.error': { en: 'Error', hi: 'Error', hinglish: 'Error' },
  'offline.title': { en: 'You are offline', hi: 'You are offline', hinglish: 'Aap offline hain' },
  'offline.desc': { en: 'Check your connection and try again', hi: 'Check your connection and try again', hinglish: 'Apna connection check karein aur dobara try karein' },
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  localStorage.setItem('lakpdf_language', lang);
  document.documentElement.lang = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  const translation = translations[key];
  if (!translation) {
    console.warn('Translation key "' + key + '" not found');
    return key;
  }
  return translation[currentLanguage];
}

export function initI18n() {
  const saved = localStorage.getItem('lakpdf_language') as Language;
  if (saved && (saved === 'en' || saved === 'hi' || saved === 'hinglish')) {
    setLanguage(saved);
  } else {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'hi') {
      setLanguage('hi');
    }
  }
}

