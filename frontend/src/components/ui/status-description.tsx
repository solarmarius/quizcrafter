import type { FailureReason, QuizStatus } from "@/client/types.gen"
import { QUIZ_STATUS } from "@/lib/constants"
import { getRelativeTimeData } from "@/lib/utils"
import { Text } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

interface StatusDescriptionProps {
  /** Current quiz status */
  status: QuizStatus
  /** Failure reason if status is failed */
  failureReason?: FailureReason | null
  /** Last status update timestamp */
  timestamp?: string | null
  /** Whether to show detailed description */
  detailed?: boolean
}

/**
 * Helper to format relative time with translation
 */
function useRelativeTime(timestamp: string | null | undefined) {
  const { t } = useTranslation("common")

  if (!timestamp) return null

  const data = getRelativeTimeData(timestamp)
  if (!data) return null

  switch (data.key) {
    case "justNow":
      return t("time.justNow")
    case "minutesAgo":
      return t("time.minutesAgo", { count: data.count })
    case "hoursAgo":
      return t("time.hoursAgo", { count: data.count })
    case "daysAgo":
      return t("time.daysAgo", { count: data.count })
  }
}

export function StatusDescription({
  status,
  failureReason,
  timestamp,
  detailed = false,
}: StatusDescriptionProps) {
  const { t } = useTranslation("quiz")
  const timeAgo = useRelativeTime(timestamp)

  const getDescription = () => {
    switch (status) {
      case QUIZ_STATUS.CREATED:
        return detailed ? t("statusDetailed.created") : t("status.created")

      case QUIZ_STATUS.EXTRACTING_CONTENT:
        return detailed
          ? t("statusDetailed.extracting_content")
          : t("status.extracting_content")

      case QUIZ_STATUS.GENERATING_QUESTIONS:
        return detailed
          ? t("statusDetailed.generating_questions")
          : t("status.generating_questions")

      case QUIZ_STATUS.READY_FOR_REVIEW:
        if (detailed && timeAgo) {
          return t("statusDetailed.ready_for_review_timestamp", { timeAgo })
        }
        return detailed
          ? t("statusDetailed.ready_for_review")
          : t("status.ready_for_review")

      case QUIZ_STATUS.EXPORTING_TO_CANVAS:
        return detailed
          ? t("statusDetailed.exporting_to_canvas")
          : t("status.exporting_to_canvas")

      case QUIZ_STATUS.PUBLISHED:
        if (detailed && timeAgo) {
          return t("statusDetailed.published_timestamp", { timeAgo })
        }
        return detailed ? t("statusDetailed.published") : t("status.published")

      case QUIZ_STATUS.FAILED:
        if (detailed && failureReason) {
          return t(`failureMessages.${failureReason}.message`, {
            defaultValue: t("statusDetailed.failed"),
          })
        }
        return t("status.failed")

      default:
        return t("statusDetailed.unknown")
    }
  }

  return (
    <Text fontSize="sm" color="gray.600">
      {getDescription()}
    </Text>
  )
}
