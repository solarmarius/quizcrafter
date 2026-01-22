import { IconButton } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { MdRefresh } from "react-icons/md"

import {
  type QuestionDifficulty,
  type QuestionType,
  QuizService,
} from "@/client"
import { useCustomToast, useErrorHandler } from "@/hooks/common"

const GENERATION_TIMEOUT_MS = 120000
const STORAGE_KEY = "quizcrafter_generating_batches"

interface GeneratingBatchEntry {
  timestamp: number
}

type GeneratingBatches = Record<string, GeneratingBatchEntry>

/**
 * Get the storage key for a specific batch.
 */
function getBatchKey(
  quizId: string,
  moduleId: string,
  questionType: string,
  difficulty: string,
): string {
  return `${quizId}_${moduleId}_${questionType}_${difficulty}`
}

/**
 * Load generating batches from localStorage.
 */
function loadGeneratingBatches(): GeneratingBatches {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as GeneratingBatches
  } catch {
    return {}
  }
}

/**
 * Save generating batches to localStorage.
 */
function saveGeneratingBatches(batches: GeneratingBatches): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a batch is still within the generation timeout window.
 */
function isBatchStillGenerating(
  entry: GeneratingBatchEntry | undefined,
): boolean {
  if (!entry) return false
  const elapsed = Date.now() - entry.timestamp
  return elapsed < GENERATION_TIMEOUT_MS
}

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
 * Persists generating state in localStorage to survive page refreshes.
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

  const batchKey = getBatchKey(
    quizId,
    moduleId,
    batch.questionType,
    batch.difficulty,
  )

  // Initialize state from localStorage
  const [isGenerating, setIsGenerating] = useState(() => {
    const batches = loadGeneratingBatches()
    return isBatchStillGenerating(batches[batchKey])
  })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Mark batch as generating in localStorage
  const markBatchGenerating = useCallback(() => {
    const batches = loadGeneratingBatches()
    batches[batchKey] = { timestamp: Date.now() }
    saveGeneratingBatches(batches)
    setIsGenerating(true)
  }, [batchKey])

  // Clear batch from localStorage
  const clearBatchGenerating = useCallback(() => {
    const batches = loadGeneratingBatches()
    delete batches[batchKey]
    saveGeneratingBatches(batches)
    setIsGenerating(false)
  }, [batchKey])

  // On mount, check if batch is still within timeout window and set up cleanup
  useEffect(() => {
    const batches = loadGeneratingBatches()
    const entry = batches[batchKey]

    if (isBatchStillGenerating(entry)) {
      // Calculate remaining time
      const elapsed = Date.now() - entry.timestamp
      const remaining = GENERATION_TIMEOUT_MS - elapsed

      setIsGenerating(true)
      timeoutRef.current = setTimeout(() => {
        clearBatchGenerating()
      }, remaining)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [batchKey, clearBatchGenerating])

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
      markBatchGenerating()

      // Clear generating state after timeout
      timeoutRef.current = setTimeout(() => {
        clearBatchGenerating()
      }, GENERATION_TIMEOUT_MS)

      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] })
      queryClient.invalidateQueries({ queryKey: ["questions", quizId] })
    },
    onError: (error) => {
      clearBatchGenerating()
      handleError(error)
    },
  })

  const isLoading = regenerateMutation.isPending || isGenerating

  return (
    <IconButton
      aria-label={t("batchRegeneration.regenerateAriaLabel")}
      title={
        isGenerating
          ? t("batchRegeneration.generating")
          : t("batchRegeneration.regenerateTooltip")
      }
      size="2xs"
      variant="ghost"
      colorPalette="blue"
      onClick={() => regenerateMutation.mutate()}
      loading={isLoading}
      disabled={disabled || isLoading}
    >
      <MdRefresh />
    </IconButton>
  )
}
