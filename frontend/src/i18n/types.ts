import "i18next"

import type enCommon from "./locales/en/common.json"
import type enCreation from "./locales/en/creation.json"
import type enDashboard from "./locales/en/dashboard.json"
import type enNavigation from "./locales/en/navigation.json"
import type enQuiz from "./locales/en/quiz.json"
import type enValidation from "./locales/en/validation.json"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common"
    resources: {
      common: typeof enCommon
      navigation: typeof enNavigation
      quiz: typeof enQuiz
      creation: typeof enCreation
      dashboard: typeof enDashboard
      validation: typeof enValidation
    }
  }
}
