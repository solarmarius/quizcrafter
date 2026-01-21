import { useTranslation } from "react-i18next"

import { type UILanguage, UI_LANGUAGES } from "@/i18n"

/**
 * Hook for getting language-specific routes based on current UI language.
 * @returns Object with getLocalizedRoute function and current language info
 */
export function useLocalizedRoute() {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.language as UILanguage

  /**
   * Returns the appropriate route based on current UI language.
   * Falls back to English route if current language is not found.
   * @param routes Object mapping language codes to route paths
   * @returns The route for the current language
   */
  const getLocalizedRoute = (routes: Record<UILanguage, string>): string => {
    return routes[currentLanguage] ?? routes[UI_LANGUAGES.ENGLISH]
  }

  return {
    currentLanguage,
    getLocalizedRoute,
    isNorwegian: currentLanguage === UI_LANGUAGES.NORWEGIAN,
    isEnglish: currentLanguage === UI_LANGUAGES.ENGLISH,
  }
}
