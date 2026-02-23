import { Box, Button, Card, HStack, Text, VStack } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { MdAutoAwesome, MdRefresh } from "react-icons/md"

import { type Quiz, QuizService } from "@/client"
import { useCustomToast, useErrorHandler } from "@/hooks/common"
import { QUIZ_STATUS } from "@/lib/constants"

/**
 * Interface for generation metadata structure stored in quiz.generation_metadata
 */
interface GenerationMetadata {
  /** List of successful batch keys (format: "{module_id}_{question_type}_{target_count}") */
  successful_batches?: string[]
  /** List of failed batch keys */
  failed_batches?: string[]
  /** Total target number of questions across all batches */
  total_questions_target?: number
  /** Total number of questions successfully saved */
  total_questions_saved?: number
  /** Success rate as a decimal (0.0 to 1.0) */
  batch_success_rate?: number
}

interface QuestionGenerationTriggerProps {
  quiz: Quiz
}

export function QuestionGenerationTrigger({
  quiz,
}: QuestionGenerationTriggerProps) {
  const { t } = useTranslation("quiz")
  const { showSuccessToast } = useCustomToast()
  const { handleError } = useErrorHandler()
  const queryClient = useQueryClient()

  // Determine if this is a retry scenario
  const isPartialRetry = quiz.status === QUIZ_STATUS.READY_FOR_REVIEW_PARTIAL
  const isFailedRetry =
    quiz.status === QUIZ_STATUS.FAILED &&
    (quiz.failure_reason === "llm_generation_error" ||
      quiz.failure_reason === "no_questions_generated")

  const triggerGenerationMutation = useMutation({
    mutationFn: async () => {
      if (!quiz.id) {
        throw new Error("Quiz ID is required")
      }

      return await QuizService.triggerQuestionGeneration({
        quizId: quiz.id,
      })
    },
    onSuccess: (response) => {
      const successMessage =
        response.message ||
        (isPartialRetry
          ? t("generationTrigger.retryStarted")
          : t("generationTrigger.generationStarted"))
      showSuccessToast(successMessage)
      queryClient.invalidateQueries({ queryKey: ["quiz", quiz.id] })
    },
    onError: handleError,
  })

  // Don't show if quiz ID is missing
  if (!quiz.id) {
    return null
  }

  // Only show if generation can be retried (failed or partial success)
  if (!isPartialRetry && !isFailedRetry) {
    return null
  }

  // Get progress information for partial retry scenarios
  const getProgressInfo = () => {
    if (!isPartialRetry || !quiz.generation_metadata) return null

    // Type-safe access to generation metadata
    const metadata = quiz.generation_metadata as GenerationMetadata

    // Parse question counts from batch keys (format: "{module_id}_{type}_{count}_{difficulty}")
    const parseBatchCount = (keys: string[]) =>
      keys.reduce((sum, key) => {
        const parts = key.split("_")
        const count = Number.parseInt(parts[parts.length - 2], 10)
        return sum + (Number.isNaN(count) ? 0 : count)
      }, 0)

    const failedBatches = metadata.failed_batches ?? []
    const successfulBatches = metadata.successful_batches ?? []
    const remainingQuestions = parseBatchCount(failedBatches)
    const savedQuestions = parseBatchCount(successfulBatches)
    const totalQuestions = savedQuestions + remainingQuestions
    const successRate =
      totalQuestions > 0 ? (savedQuestions / totalQuestions) * 100 : 0

    return {
      totalQuestions,
      savedQuestions,
      remainingQuestions,
      successRate,
      successfulBatches: successfulBatches.length,
      failedBatches: failedBatches.length,
    }
  }

  const progressInfo = getProgressInfo()

  return (
    <Card.Root>
      <Card.Body>
        <VStack gap={4} align="stretch">
          <Box textAlign="center">
            <Text fontSize="xl" fontWeight="bold" mb={2}>
              {isPartialRetry
                ? t("generationTrigger.partialTitle")
                : t("generationTrigger.failedTitle")}
            </Text>
            <Text color="gray.600" mb={4}>
              {isPartialRetry
                ? t("generationTrigger.partialMessage", {
                    count: progressInfo?.remainingQuestions || 0,
                  })
                : t("generationTrigger.failedMessage", {
                    count: quiz.question_count,
                  })}
            </Text>
          </Box>

          {/* Progress information for partial retry */}
          {isPartialRetry && progressInfo && (
            <Box
              p={4}
              bg="purple.50"
              borderRadius="md"
              border="1px solid"
              borderColor="purple.200"
            >
              <VStack gap={3}>
                <HStack gap={4} fontSize="sm" color="purple.600">
                  <Text>
                    ✓{" "}
                    {t("generationTrigger.batchesSucceeded", {
                      count: progressInfo.successfulBatches,
                    })}
                  </Text>
                  <Text>
                    ✗{" "}
                    {t("generationTrigger.batchesFailed", {
                      count: progressInfo.failedBatches,
                    })}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          )}

          {/* Settings information for complete failure */}
          {isFailedRetry && (
            <Box
              p={4}
              bg="blue.50"
              borderRadius="md"
              border="1px solid"
              borderColor="blue.200"
            >
              <VStack gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="blue.700">
                  {t("generationTrigger.generationSettings")}
                </Text>
                <HStack gap={4} fontSize="sm" color="blue.600">
                  <Text>
                    {t("generationTrigger.questionsCount", {
                      count: quiz.question_count,
                    })}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          )}

          <Button
            size="lg"
            colorScheme={isPartialRetry ? "purple" : "blue"}
            onClick={() => triggerGenerationMutation.mutate()}
            loading={triggerGenerationMutation.isPending}
            width="100%"
          >
            {isPartialRetry ? <MdRefresh /> : <MdAutoAwesome />}
            {isPartialRetry
              ? t("generationTrigger.retryFailedBatches")
              : t("generationTrigger.retryGeneration")}
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
