import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

// Import English translation files
import enCommon from "./locales/en/common.json"
import enCoverage from "./locales/en/coverage.json"
import enCreation from "./locales/en/creation.json"
import enDashboard from "./locales/en/dashboard.json"
import enNavigation from "./locales/en/navigation.json"
import enQuestionTypes from "./locales/en/questionTypes.json"
import enQuiz from "./locales/en/quiz.json"
import enValidation from "./locales/en/validation.json"

// Import Norwegian translation files
import noCommon from "./locales/no/common.json"
import noCoverage from "./locales/no/coverage.json"
import noCreation from "./locales/no/creation.json"
import noDashboard from "./locales/no/dashboard.json"
import noNavigation from "./locales/no/navigation.json"
import noQuestionTypes from "./locales/no/questionTypes.json"
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
    coverage: enCoverage,
    navigation: enNavigation,
    quiz: enQuiz,
    creation: enCreation,
    dashboard: enDashboard,
    validation: enValidation,
    questionTypes: enQuestionTypes,
  },
  no: {
    common: noCommon,
    coverage: noCoverage,
    navigation: noNavigation,
    quiz: noQuiz,
    creation: noCreation,
    dashboard: noDashboard,
    validation: noValidation,
    questionTypes: noQuestionTypes,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: [
      "common",
      "coverage",
      "navigation",
      "quiz",
      "creation",
      "dashboard",
      "validation",
      "questionTypes",
    ],

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
