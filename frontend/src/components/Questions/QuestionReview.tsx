import { Box, Button, Card, HStack, VStack } from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  type QuestionResponse,
  type QuestionType,
  type QuestionUpdateRequest,
  QuestionsService,
  type QuizStatus,
} from "@/client"
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/Common"
import {
  useApiMutation,
  useEditingState,
  useQuestionSelection,
} from "@/hooks/common"
import { QUIZ_STATUS, UI_SIZES } from "@/lib/constants"
import { queryKeys, questionsQueryConfig } from "@/lib/queryConfig"
import { BulkActionToolbar } from "./BulkActionToolbar"
import { QuestionFilters } from "./QuestionFilters"
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
  const queryClient = useQueryClient()
  const [filterView, setFilterView] = useState<"pending" | "all">("pending")
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(
    new Set(),
  )
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<
    Set<QuestionType>
  >(new Set())
  const [rejectingQuestionId, setRejectingQuestionId] = useState<string | null>(
    null,
  )
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const { editingId, startEditing, cancelEditing, isEditing } =
    useEditingState<QuestionResponse>((question) => question.id)

  // Selection state for bulk operations
  const { selectionCount, isSelected, toggle, clearSelection, getSelectedIds } =
    useQuestionSelection()

  const isPublished = quizStatus === QUIZ_STATUS.PUBLISHED

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

  // Derive available modules and question types from actual questions
  const { availableModules, availableQuestionTypes } = useMemo(() => {
    if (!questions || questions.length === 0) {
      return { availableModules: [], availableQuestionTypes: [] }
    }

    const moduleSet = new Set<string>()
    const typeSet = new Set<QuestionType>()

    for (const q of questions) {
      if (q.module_id) {
        moduleSet.add(String(q.module_id))
      }
      if (q.question_type) {
        typeSet.add(q.question_type)
      }
    }

    const modules = Array.from(moduleSet).map((id) => ({
      id,
      name: selectedModules?.[id]?.name || `Module ${id}`,
    }))

    return {
      availableModules: modules,
      availableQuestionTypes: Array.from(typeSet),
    }
  }, [questions, selectedModules])

  // Filter questions based on current view and calculate counts
  const { filteredQuestions, pendingCount, totalCount, filteredCount } =
    useMemo(() => {
      if (!questions) {
        return {
          filteredQuestions: [],
          pendingCount: 0,
          totalCount: 0,
          filteredCount: 0,
        }
      }

      const pending = questions.filter((q) => !q.is_approved)
      let filtered = filterView === "pending" ? pending : questions

      // Apply module filter (empty set = all modules)
      if (selectedModuleIds.size > 0) {
        filtered = filtered.filter(
          (q) => q.module_id && selectedModuleIds.has(String(q.module_id)),
        )
      }

      // Apply question type filter (empty set = all types)
      if (selectedQuestionTypes.size > 0) {
        filtered = filtered.filter(
          (q) => q.question_type && selectedQuestionTypes.has(q.question_type),
        )
      }

      return {
        filteredQuestions: filtered,
        pendingCount: pending.length,
        totalCount: questions.length,
        filteredCount: filtered.length,
      }
    }, [questions, filterView, selectedModuleIds, selectedQuestionTypes])

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

  // Bulk approve mutation
  const bulkApproveMutation = useApiMutation(
    async (questionIds: string[]) => {
      return await QuestionsService.bulkApproveQuestions({
        quizId,
        requestBody: { question_ids: questionIds },
      })
    },
    {
      onSuccess: () => {
        clearSelection()
        // Invalidate queries manually since we have a custom success message
        queryClient.invalidateQueries({
          queryKey: queryKeys.quizQuestions(quizId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.quizQuestionStats(quizId),
        })
      },
      successMessage: t("questions.bulk.approveSuccess", {
        count: selectionCount,
      }),
    },
  )

  // Bulk delete mutation
  const bulkDeleteMutation = useApiMutation(
    async ({
      questionIds,
      rejectionReason,
      rejectionFeedback,
    }: {
      questionIds: string[]
      rejectionReason?: RejectionReason
      rejectionFeedback?: string
    }) => {
      return await QuestionsService.bulkDeleteQuestions({
        quizId,
        requestBody: {
          question_ids: questionIds,
          rejection_reason: rejectionReason,
          rejection_feedback: rejectionFeedback,
        },
      })
    },
    {
      onSuccess: () => {
        clearSelection()
        setBulkRejectOpen(false)
        // Invalidate queries manually
        queryClient.invalidateQueries({
          queryKey: queryKeys.quizQuestions(quizId),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.quizQuestionStats(quizId),
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.quiz(quizId) })
      },
      successMessage: t("questions.bulk.rejectSuccess", {
        count: selectionCount,
      }),
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

  // Handle bulk rejection with feedback
  const handleBulkReject = (reason: RejectionReason, feedback?: string) => {
    const ids = getSelectedIds()
    if (ids.length === 0) return
    bulkDeleteMutation.mutate({
      questionIds: ids,
      rejectionReason: reason,
      rejectionFeedback: feedback,
    })
  }

  // Handle bulk approve
  const handleBulkApprove = () => {
    const ids = getSelectedIds()
    if (ids.length === 0) return
    bulkApproveMutation.mutate(ids)
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
      {/* Filter Toggle Buttons and Filter Dropdown */}
      <HStack gap={3} justify="space-between">
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

        {/* Module and Question Type Filters */}
        <QuestionFilters
          availableModules={availableModules}
          selectedModuleIds={selectedModuleIds}
          onModuleFilterChange={setSelectedModuleIds}
          availableQuestionTypes={availableQuestionTypes}
          selectedQuestionTypes={selectedQuestionTypes}
          onQuestionTypeFilterChange={setSelectedQuestionTypes}
          totalCount={filterView === "pending" ? pendingCount : totalCount}
          filteredCount={filteredCount}
        />
      </HStack>

      {/* Bulk Action Toolbar - only shows when questions are selected */}
      {!isPublished && (
        <BulkActionToolbar
          selectedCount={selectionCount}
          onApproveSelected={handleBulkApprove}
          onRejectSelected={() => setBulkRejectOpen(true)}
          onClearSelection={clearSelection}
          isApproving={bulkApproveMutation.isPending}
          isRejecting={bulkDeleteMutation.isPending}
          isPublished={isPublished}
        />
      )}

      {/* Empty state for filtered view */}
      {filteredQuestions.length === 0 && (
        <Card.Root>
          <Card.Body>
            <EmptyState
              title={
                selectedModuleIds.size > 0 || selectedQuestionTypes.size > 0
                  ? t("questions.filters.noResults")
                  : filterView === "pending"
                    ? t("questions.noPending")
                    : t("questions.noQuestionsFound")
              }
              description={
                selectedModuleIds.size > 0 || selectedQuestionTypes.size > 0
                  ? t("questions.filters.tryDifferent")
                  : filterView === "pending"
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
        // Selection props
        selectionEnabled={!isPublished}
        isSelected={isSelected}
        onToggleSelection={toggle}
      />

      {/* Single Question Rejection Feedback Dialog */}
      <RejectionFeedbackDialog
        key={rejectingQuestionId ?? "closed"}
        isOpen={rejectingQuestionId !== null}
        onClose={() => setRejectingQuestionId(null)}
        onReject={handleRejectQuestion}
        isLoading={deleteQuestionMutation.isPending}
      />

      {/* Bulk Rejection Feedback Dialog */}
      <RejectionFeedbackDialog
        key={bulkRejectOpen ? "bulk-open" : "bulk-closed"}
        isOpen={bulkRejectOpen}
        onClose={() => setBulkRejectOpen(false)}
        onReject={handleBulkReject}
        isLoading={bulkDeleteMutation.isPending}
        bulkCount={selectionCount}
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
