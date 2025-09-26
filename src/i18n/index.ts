import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import sk from './locales/sk.json'
import zh from './locales/zh.json'
import de from './locales/de.json'
import es from './locales/es.json'

export type MessageLanguages = keyof typeof messages
export type MessageSchema = typeof messages['en']

const messages = {
  en,
  sk,
  zh,
  de,
  es
}

const i18n = createI18n<[MessageSchema], MessageLanguages>({
  legacy: false,
  locale: 'en', // Default locale
  fallbackLocale: 'en',
  messages
})

export default i18n