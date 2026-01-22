import { Box, Button, Card, HStack, VStack } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  type QuestionResponse,
  type QuestionUpdateRequest,
  QuestionsService,
  type QuizStatus,
} from "@/client"
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/Common"
import { useApiMutation, useEditingState } from "@/hooks/common"
import { UI_SIZES } from "@/lib/constants"
import { queryKeys, questionsQueryConfig } from "@/lib/queryConfig"
import {
  RejectionFeedbackDialog,
  type RejectionReason,
} from "./RejectionFeedbackDialog"
import { VirtualQuestionList } from "./VirtualQuestionList"

/**
 * Props for the QuestionReview component.
 * Provides a comprehensive question review interface for quiz questions.
 * Allows filtering, editing, approval, and deletion of questions.
 *
 * @example
 * ```tsx
 * // Basic usage in a quiz management page
 * <QuestionReview quizId="quiz-123" />
 *
 * // Usage in a route component
 * function QuizReviewPage() {
 *   const { quizId } = useParams()
 *
 *   return (
 *     <Container maxW="4xl">
 *       <QuestionReview quizId={quizId} />
 *     </Container>
 *   )
 * }
 *
 * // Usage with conditional rendering
 * {quiz?.id && <QuestionReview quizId={quiz.id} />}
 * ```
 */
interface QuestionReviewProps {
  /** The ID of the quiz whose questions should be reviewed */
  quizId: string
  /** The current status of the quiz */
  quizStatus?: QuizStatus
  /** Module data for displaying source module names */
  selectedModules?: Record<string, { name?: string; [key: string]: unknown }>
}

export function QuestionReview({
  quizId,
  quizStatus,
  selectedModules,
}: QuestionReviewProps) {
  const { t } = useTranslation("quiz")
  const [filterView, setFilterView] = useState<"pending" | "all">("pending")
  const [rejectingQuestionId, setRejectingQuestionId] = useState<string | null>(
    null,
  )
  const { editingId, startEditing, cancelEditing, isEditing } =
    useEditingState<QuestionResponse>((question) => question.id)

  // Fetch questions with optimized caching
  const {
    data: questions,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.quizQuestions(quizId),
    queryFn: async () => {
      const response = await QuestionsService.getQuizQuestions({
        quizId,
        approvedOnly: false, // Get all questions for review
      })
      return response
    },
    ...questionsQueryConfig,
  })

  // Filter questions based on current view and calculate counts
  const { filteredQuestions, pendingCount, totalCount } = useMemo(() => {
    if (!questions) {
      return { filteredQuestions: [], pendingCount: 0, totalCount: 0 }
    }

    const pending = questions.filter((q) => !q.is_approved)
    const filtered = filterView === "pending" ? pending : questions

    return {
      filteredQuestions: filtered,
      pendingCount: pending.length,
      totalCount: questions.length,
    }
  }, [questions, filterView])

  // Approve question mutation
  const approveQuestionMutation = useApiMutation(
    async (questionId: string) => {
      return await QuestionsService.approveQuestion({
        quizId,
        questionId,
      })
    },
    {
      successMessage: t("questions.questionApproved"),
      invalidateQueries: [
        queryKeys.quizQuestions(quizId),
        queryKeys.quizQuestionStats(quizId),
      ],
    },
  )

  // Update question mutation
  const updateQuestionMutation = useApiMutation(
    async ({
      questionId,
      data,
    }: {
      questionId: string
      data: QuestionUpdateRequest
    }) => {
      return await QuestionsService.updateQuestion({
        quizId,
        questionId,
        requestBody: data,
      })
    },
    {
      successMessage: t("questions.questionUpdated"),
      invalidateQueries: [queryKeys.quizQuestions(quizId)],
      onSuccess: () => {
        cancelEditing()
      },
    },
  )

  // Delete question mutation with rejection feedback
  const deleteQuestionMutation = useApiMutation(
    async ({
      questionId,
      rejectionReason,
      rejectionFeedback,
    }: {
      questionId: string
      rejectionReason: RejectionReason
      rejectionFeedback?: string
    }) => {
      return await QuestionsService.deleteQuestion({
        quizId,
        questionId,
        requestBody: {
          rejection_reason: rejectionReason,
          rejection_feedback: rejectionFeedback,
        },
      })
    },
    {
      successMessage: t("questions.questionRejected"),
      invalidateQueries: [
        queryKeys.quizQuestions(quizId),
        queryKeys.quizQuestionStats(quizId),
        queryKeys.quiz(quizId), // Invalidate quiz cache to update question_count
      ],
      onSuccess: () => {
        setRejectingQuestionId(null)
      },
    },
  )

  // Handle rejection with feedback
  const handleRejectQuestion = (reason: RejectionReason, feedback?: string) => {
    if (!rejectingQuestionId) return
    deleteQuestionMutation.mutate({
      questionId: rejectingQuestionId,
      rejectionReason: reason,
      rejectionFeedback: feedback,
    })
  }

  // Create a callback that binds the question ID for the editor
  const getSaveCallback = useCallback(
    (id: string) => (updateData: QuestionUpdateRequest) => {
      updateQuestionMutation.mutate({
        questionId: id,
        data: updateData,
      })
    },
    [updateQuestionMutation],
  )

  if (isLoading) {
    return <QuestionReviewSkeleton />
  }

  if (error || !questions) {
    return (
      <Card.Root>
        <Card.Body>
          <ErrorState
            title={t("questions.loadFailed")}
            message={t("questions.loadFailedDescription")}
            showRetry={false}
          />
        </Card.Body>
      </Card.Root>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <Card.Root>
        <Card.Body>
          <EmptyState
            title={t("questions.noQuestions")}
            description={t("questions.noQuestionsDescription")}
          />
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Filter Toggle Buttons */}
      <HStack gap={3}>
        <Button
          variant={filterView === "pending" ? "solid" : "outline"}
          colorPalette="blue"
          size="sm"
          onClick={() => setFilterView("pending")}
        >
          {t("questions.pendingApproval", { count: pendingCount })}
        </Button>
        <Button
          variant={filterView === "all" ? "solid" : "outline"}
          colorPalette="blue"
          size="sm"
          onClick={() => setFilterView("all")}
        >
          {t("questions.allQuestions", { count: totalCount })}
        </Button>
      </HStack>

      {/* Empty state for filtered view */}
      {filteredQuestions.length === 0 && (
        <Card.Root>
          <Card.Body>
            <EmptyState
              title={
                filterView === "pending"
                  ? t("questions.noPending")
                  : t("questions.noQuestionsFound")
              }
              description={
                filterView === "pending"
                  ? t("questions.allApprovedSwitch")
                  : t("questions.noMatchFilter")
              }
            />
          </Card.Body>
        </Card.Root>
      )}

      <VirtualQuestionList
        questions={filteredQuestions}
        editingId={editingId}
        startEditing={startEditing}
        cancelEditing={cancelEditing}
        isEditing={isEditing}
        getSaveCallback={getSaveCallback}
        onApproveQuestion={(id) => approveQuestionMutation.mutate(id)}
        onDeleteQuestion={(id) => setRejectingQuestionId(id)}
        isUpdateLoading={updateQuestionMutation.isPending}
        isApproveLoading={approveQuestionMutation.isPending}
        isDeleteLoading={deleteQuestionMutation.isPending}
        quizStatus={quizStatus}
        selectedModules={selectedModules}
      />

      {/* Rejection Feedback Dialog */}
      <RejectionFeedbackDialog
        key={rejectingQuestionId ?? "closed"}
        isOpen={rejectingQuestionId !== null}
        onClose={() => setRejectingQuestionId(null)}
        onReject={handleRejectQuestion}
        isLoading={deleteQuestionMutation.isPending}
      />
    </VStack>
  )
}

function QuestionReviewSkeleton() {
  return (
    <VStack gap={6} align="stretch">
      <Box>
        <LoadingSkeleton
          height={UI_SIZES.SKELETON.HEIGHT.XXL}
          width={UI_SIZES.SKELETON.WIDTH.TEXT_LG}
        />
        <Box mt={2}>
          <LoadingSkeleton
            height={UI_SIZES.SKELETON.HEIGHT.LG}
            width={UI_SIZES.SKELETON.WIDTH.TEXT_XL}
          />
        </Box>
      </Box>

      {[1, 2, 3].map((i) => (
        <Card.Root key={i}>
          <Card.Header>
            <HStack justify="space-between">
              <LoadingSkeleton
                height={UI_SIZES.SKELETON.HEIGHT.XL}
                width={UI_SIZES.SKELETON.WIDTH.TEXT_MD}
              />
              <HStack gap={2}>
                <LoadingSkeleton
                  height={UI_SIZES.SKELETON.HEIGHT.XXL}
                  width={UI_SIZES.SKELETON.WIDTH.SM}
                />
                <LoadingSkeleton
                  height={UI_SIZES.SKELETON.HEIGHT.XXL}
                  width={UI_SIZES.SKELETON.WIDTH.SM}
                />
                <LoadingSkeleton
                  height={UI_SIZES.SKELETON.HEIGHT.XXL}
                  width={UI_SIZES.SKELETON.WIDTH.SM}
                />
              </HStack>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <LoadingSkeleton
                height={UI_SIZES.SKELETON.HEIGHT.LG}
                width={UI_SIZES.SKELETON.WIDTH.FULL}
              />
              <VStack gap={2} align="stretch">
                <LoadingSkeleton
                  height={UI_SIZES.SKELETON.HEIGHT.XXL}
                  width={UI_SIZES.SKELETON.WIDTH.FULL}
                  lines={4}
                />
              </VStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      ))}
    </VStack>
  )
}
