import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

// Import English translation files
import enCommon from "./locales/en/common.json"
import enCreation from "./locales/en/creation.json"
import enDashboard from "./locales/en/dashboard.json"
import enNavigation from "./locales/en/navigation.json"
import enQuiz from "./locales/en/quiz.json"
import enValidation from "./locales/en/validation.json"

// Import Norwegian translation files
import noCommon from "./locales/no/common.json"
import noCreation from "./locales/no/creation.json"
import noDashboard from "./locales/no/dashboard.json"
import noNavigation from "./locales/no/navigation.json"
import noQuiz from "./locales/no/quiz.json"
import noValidation from "./locales/no/validation.json"

export const UI_LANGUAGES = {
  ENGLISH: "en",
  NORWEGIAN: "no",
} as const

export type UILanguage = (typeof UI_LANGUAGES)[keyof typeof UI_LANGUAGES]

export const UI_LANGUAGE_LABELS: Record<UILanguage, string> = {
  en: "English",
  no: "Norsk",
}

export const STORAGE_KEY_UI_LANGUAGE = "quizcrafter_ui_language"

const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    quiz: enQuiz,
    creation: enCreation,
    dashboard: enDashboard,
    validation: enValidation,
  },
  no: {
    common: noCommon,
    navigation: noNavigation,
    quiz: noQuiz,
    creation: noCreation,
    dashboard: noDashboard,
    validation: noValidation,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "navigation", "quiz", "creation", "dashboard", "validation"],

    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY_UI_LANGUAGE,
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false,
    },
  })

export default i18n
