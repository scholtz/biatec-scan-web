import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import sk from './locales/sk.json'
import zh from './locales/zh.json'
import de from './locales/de.json'
import es from './locales/es.json'
import cs from './locales/cs.json'
import ru from './locales/ru.json'
import pl from './locales/pl.json'

export type MessageLanguages = keyof typeof messages
export type MessageSchema = typeof messages['en']

const messages = {
  en,
  sk,
  zh,
  de,
  es,
  cs,
  ru,
  pl
}

// Function to detect browser language
const detectBrowserLanguage = (): string => {
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && Object.keys(messages).includes(savedLocale)) {
    return savedLocale
  }

  // Check browser language
  const browserLanguage = navigator.language.split('-')[0] // Get language code without region
  if (Object.keys(messages).includes(browserLanguage)) {
    return browserLanguage
  }

  // Fallback to English
  return 'en'
}

const i18n = createI18n<[MessageSchema], MessageLanguages>({
  legacy: false,
  locale: detectBrowserLanguage(),
  fallbackLocale: 'en',
  messages
})

export default i18n