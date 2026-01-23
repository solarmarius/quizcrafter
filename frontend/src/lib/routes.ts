import { type UILanguage, UI_LANGUAGES } from "@/i18n"

/**
 * Route definitions for pages that have language-specific versions.
 * Each entry maps language codes to their corresponding route paths.
 */
export const LOCALIZED_ROUTES: Record<string, Record<UILanguage, string>> = {
  privacyPolicy: {
    [UI_LANGUAGES.ENGLISH]: "/privacy-policy",
    [UI_LANGUAGES.NORWEGIAN]: "/privacy-policy-no",
  },
  questionTypes: {
    [UI_LANGUAGES.ENGLISH]: "/question-types",
    [UI_LANGUAGES.NORWEGIAN]: "/question-types-no",
  },
}
