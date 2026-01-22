import { Badge, HStack, Text, VStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

import type { Quiz } from "@/client/types.gen"
import { RegenerateBatchButton } from "@/components/Questions/RegenerateBatchButton"
import { QUESTION_DIFFICULTY_LABELS, QUIZ_STATUS } from "@/lib/constants"
import {
  formatQuestionTypeDisplay,
  getModuleQuestionBatchBreakdown,
  getModuleQuestionTypeBreakdown,
} from "@/lib/utils"

interface QuestionTypeBreakdownProps {
  quiz: Quiz
  variant?: "compact" | "detailed"
  showRegenerateButtons?: boolean
}

/**
 * Component to display question type breakdown for a quiz
 *
 * @param quiz - The quiz object containing selected modules and question batches
 * @param variant - Display style: "compact" shows aggregated counts, "detailed" shows per-module breakdown
 */
export const QuestionTypeBreakdown = memo(function QuestionTypeBreakdown({
  quiz,
  variant = "detailed",
  showRegenerateButtons = false,
}: QuestionTypeBreakdownProps) {
  const { t } = useTranslation("quiz")
  const breakdown = getModuleQuestionTypeBreakdown(quiz)
  const batchBreakdown = getModuleQuestionBatchBreakdown(quiz)
  const moduleEntries = Object.entries(breakdown)

  // Determine if quiz is in a state that allows regeneration
  const canRegenerate =
    showRegenerateButtons &&
    quiz.id &&
    (quiz.status === QUIZ_STATUS.READY_FOR_REVIEW ||
      quiz.status === QUIZ_STATUS.READY_FOR_REVIEW_PARTIAL)

  if (moduleEntries.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500">
        {t("questionTypeBreakdown.noQuestionTypesConfigured")}
      </Text>
    )
  }

  if (variant === "compact") {
    // Show aggregated counts across all modules
    const aggregatedTypes: Record<string, number> = {}

    moduleEntries.forEach(([_, moduleTypes]) => {
      Object.entries(moduleTypes).forEach(([type, count]) => {
        aggregatedTypes[type] = (aggregatedTypes[type] || 0) + count
      })
    })

    return (
      <>
        <Text fontSize="xs" color="gray.500" mb={1}>
          {t("questionTypeBreakdown.batchesGeneratedByLLM")}
        </Text>
        <HStack
          gap={2}
          flexWrap="wrap"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={2}
        >
          {Object.entries(aggregatedTypes).map(([type, count]) => (
            <Badge key={type} variant="solid" size="sm">
              {formatQuestionTypeDisplay(type)}: {count}
            </Badge>
          ))}
        </HStack>
      </>
    )
  }

  return (
    <>
      <Text fontSize="xs" color="gray.500" mb={1}>
        {t("questionTypeBreakdown.batchesGeneratedByLLM")}
      </Text>
      <VStack
        align="stretch"
        gap={2}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={2}
      >
        {Object.entries(batchBreakdown).map(([moduleId, batches]) => {
          const moduleName =
            (quiz.selected_modules as any)?.[moduleId]?.name ||
            t("questionTypeBreakdown.moduleFallback", { id: moduleId })

          return (
            <HStack key={moduleId} justify="space-between" align="flex-start">
              <Text fontSize="sm" fontWeight="medium" color="gray.700">
                {moduleName}:
              </Text>
              <VStack align="flex-end" gap={1}>
                {batches.map((batch, index) => (
                  <HStack
                    key={`${batch.questionType}-${batch.difficulty}-${index}`}
                    gap={1}
                  >
                    <Badge variant="outline" size="sm">
                      {formatQuestionTypeDisplay(batch.questionType)}:{" "}
                      {batch.count} (
                      {QUESTION_DIFFICULTY_LABELS[
                        batch.difficulty as keyof typeof QUESTION_DIFFICULTY_LABELS
                      ] || batch.difficulty}
                      )
                    </Badge>
                    {canRegenerate && (
                      <RegenerateBatchButton
                        quizId={quiz.id!}
                        moduleId={moduleId}
                        batch={batch}
                      />
                    )}
                  </HStack>
                ))}
              </VStack>
            </HStack>
          )
        })}
      </VStack>
    </>
  )
})
