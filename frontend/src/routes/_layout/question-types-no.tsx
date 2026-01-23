import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { QuestionTypesPage } from "@/components/QuestionTypes"
import { UI_LANGUAGES } from "@/i18n"

export const Route = createFileRoute("/_layout/question-types-no")({
  component: QuestionTypesNo,
})

function QuestionTypesNo() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    if (i18n.language === UI_LANGUAGES.ENGLISH) {
      navigate({ to: "/question-types", replace: true })
    }
  }, [i18n.language, navigate])

  return <QuestionTypesPage />
}
