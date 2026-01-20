import { Badge } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface QuizBadgesProps {
  questionCount: number
}

export const QuizBadges = memo(function QuizBadges({
  questionCount,
}: QuizBadgesProps) {
  const { t } = useTranslation("dashboard")

  return (
    <Badge variant="solid" colorScheme="blue" size="sm">
      {t("badges.questionCount", { count: questionCount })}
    </Badge>
  )
})
