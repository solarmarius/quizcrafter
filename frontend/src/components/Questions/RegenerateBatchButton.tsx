import { IconButton } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { MdRefresh } from "react-icons/md"

import {
  type QuestionDifficulty,
  type QuestionType,
  QuizService,
} from "@/client"
import { useCustomToast, useErrorHandler } from "@/hooks/common"

interface RegenerateBatchButtonProps {
  quizId: string
  moduleId: string
  batch: {
    questionType: string
    count: number
    difficulty: string
  }
  disabled?: boolean
}

/**
 * Button to trigger regeneration of a single batch of questions.
 * Adds new questions to existing ones (does not replace).
 */
export function RegenerateBatchButton({
  quizId,
  moduleId,
  batch,
  disabled = false,
}: RegenerateBatchButtonProps) {
  const { t } = useTranslation("quiz")
  const { showSuccessToast } = useCustomToast()
  const { handleError } = useErrorHandler()
  const queryClient = useQueryClient()

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      return await QuizService.regenerateSingleBatch({
        quizId,
        requestBody: {
          module_id: moduleId,
          question_type: batch.questionType as QuestionType,
          count: batch.count,
          difficulty: batch.difficulty as QuestionDifficulty,
        },
      })
    },
    onSuccess: () => {
      showSuccessToast(t("batchRegeneration.started"))
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] })
      queryClient.invalidateQueries({ queryKey: ["questions", quizId] })
    },
    onError: handleError,
  })

  return (
    <IconButton
      aria-label={t("batchRegeneration.regenerateAriaLabel")}
      title={t("batchRegeneration.regenerateTooltip")}
      size="2xs"
      variant="ghost"
      colorPalette="blue"
      onClick={() => regenerateMutation.mutate()}
      loading={regenerateMutation.isPending}
      disabled={disabled || regenerateMutation.isPending}
    >
      <MdRefresh />
    </IconButton>
  )
}
