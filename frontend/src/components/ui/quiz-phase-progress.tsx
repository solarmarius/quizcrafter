import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import {
  MdCheckCircle,
  MdError,
  MdRadioButtonUnchecked,
  MdSchedule,
} from "react-icons/md"

import type { FailureReason, QuizStatus } from "@/client/types.gen"
import { QUIZ_STATUS } from "@/lib/constants"
import { getRelativeTimeData } from "@/lib/utils"

/**
 * Props for the QuizPhaseProgress component.
 * Displays a detailed three-phase breakdown of quiz generation progress.
 */
interface QuizPhaseProgressProps {
  /** Current consolidated quiz status */
  status: QuizStatus
  /** Failure reason if status is failed */
  failureReason?: FailureReason | null
  /** Timestamp when content was extracted */
  contentExtractedAt?: string | null
  /** Timestamp when quiz was exported */
  exportedAt?: string | null
  /** Last status update timestamp */
  lastStatusUpdate?: string | null
  /** Whether to show timestamps */
  showTimestamps?: boolean
}

/**
 * Individual phase status derived from consolidated status
 */
type PhaseStatus = "pending" | "processing" | "completed" | "failed" | "partial"

/**
 * Phase information for display
 */
interface Phase {
  id: string
  title: string
  status: PhaseStatus
  description: string
  timestamp?: string | null
  failureMessage?: string
}

/**
 * Maps consolidated quiz status to individual phase statuses
 */
function getPhaseStatuses(
  quizStatus: QuizStatus,
  failureReason?: FailureReason | null,
): { extraction: PhaseStatus; generation: PhaseStatus; export: PhaseStatus } {
  // Handle failed status - determine which phase failed based on failure reason
  if (quizStatus === QUIZ_STATUS.FAILED) {
    if (
      failureReason === "content_extraction_error" ||
      failureReason === "no_content_found"
    ) {
      return { extraction: "failed", generation: "pending", export: "pending" }
    }
    if (
      failureReason === "llm_generation_error" ||
      failureReason === "no_questions_generated"
    ) {
      return {
        extraction: "completed",
        generation: "failed",
        export: "pending",
      }
    }
    if (failureReason === "canvas_export_error") {
      return {
        extraction: "completed",
        generation: "completed",
        export: "failed",
      }
    }
    // Default: assume extraction failed
    return { extraction: "failed", generation: "pending", export: "pending" }
  }

  // Map consolidated status to phase statuses
  switch (quizStatus) {
    case QUIZ_STATUS.CREATED:
      return { extraction: "pending", generation: "pending", export: "pending" }

    case QUIZ_STATUS.EXTRACTING_CONTENT:
      return {
        extraction: "processing",
        generation: "pending",
        export: "pending",
      }

    case QUIZ_STATUS.GENERATING_QUESTIONS:
      return {
        extraction: "completed",
        generation: "processing",
        export: "pending",
      }

    case QUIZ_STATUS.READY_FOR_REVIEW:
      return {
        extraction: "completed",
        generation: "completed",
        export: "pending",
      }

    case QUIZ_STATUS.READY_FOR_REVIEW_PARTIAL:
      return {
        extraction: "completed",
        generation: "partial",
        export: "pending",
      }

    case QUIZ_STATUS.EXPORTING_TO_CANVAS:
      return {
        extraction: "completed",
        generation: "completed",
        export: "processing",
      }

    case QUIZ_STATUS.PUBLISHED:
      return {
        extraction: "completed",
        generation: "completed",
        export: "completed",
      }

    default:
      return { extraction: "pending", generation: "pending", export: "pending" }
  }
}

/**
 * Gets appropriate icon for phase status
 */
function getPhaseIcon(status: PhaseStatus) {
  switch (status) {
    case "completed":
      return <MdCheckCircle size={20} />
    case "processing":
      return <MdSchedule size={20} />
    case "failed":
      return <MdError size={20} />
    case "partial":
      return <MdSchedule size={20} />
    default:
      return <MdRadioButtonUnchecked size={20} />
  }
}

/**
 * Gets appropriate color scheme for phase status
 */
function getPhaseColor(status: PhaseStatus) {
  switch (status) {
    case "completed":
      return "green"
    case "processing":
      return "blue"
    case "failed":
      return "red"
    case "partial":
      return "yellow"
    default:
      return "gray"
  }
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

/**
 * Individual phase component
 */
function PhaseItem({
  phase,
  isLast = false,
}: { phase: Phase; isLast?: boolean }) {
  const color = getPhaseColor(phase.status)
  const icon = getPhaseIcon(phase.status)
  const relativeTime = useRelativeTime(phase.timestamp)

  return (
    <Box position="relative">
      <HStack gap={3} align="start">
        {/* Icon */}
        <Box color={`${color}.500`} flexShrink={0} mt={1}>
          {icon}
        </Box>

        {/* Content */}
        <VStack align="start" gap={1} flex={1}>
          <Text fontWeight="medium" color={`${color}.700`}>
            {phase.title}
          </Text>
          <Text fontSize="sm" color="gray.600" lineHeight="1.4">
            {phase.description}
          </Text>
          {relativeTime && (
            <Text fontSize="xs" color="gray.500">
              {relativeTime}
            </Text>
          )}
          {phase.failureMessage && (
            <Text fontSize="xs" color="red.600" mt={1}>
              {phase.failureMessage}
            </Text>
          )}
        </VStack>
      </HStack>

      {/* Connecting line */}
      {!isLast && (
        <Box
          position="absolute"
          left="10px"
          top="28px"
          width="2px"
          height="24px"
          bg="gray.200"
        />
      )}
    </Box>
  )
}

/**
 * QuizPhaseProgress component that shows detailed three-phase breakdown
 */
export function QuizPhaseProgress({
  status,
  failureReason,
  contentExtractedAt,
  exportedAt,
  lastStatusUpdate,
  showTimestamps = true,
}: QuizPhaseProgressProps) {
  const { t } = useTranslation("quiz")
  const phaseStatuses = getPhaseStatuses(status, failureReason)

  // Helper to get description based on phase and status
  const getExtractionDescription = () => {
    switch (phaseStatuses.extraction) {
      case "pending":
        return t("phases.extraction.pending")
      case "processing":
        return t("phases.extraction.processing")
      case "completed":
        return t("phases.extraction.completed")
      case "failed":
        return t("phases.extraction.failed")
      default:
        return t("phases.extraction.title")
    }
  }

  const getGenerationDescription = () => {
    switch (phaseStatuses.generation) {
      case "pending":
        return t("phases.generation.pending")
      case "processing":
        return t("phases.generation.processing")
      case "completed":
        return t("phases.generation.completed")
      case "partial":
        return t("phases.generation.partial")
      case "failed":
        return t("phases.generation.failed")
      default:
        return t("phases.generation.title")
    }
  }

  const getExportDescription = () => {
    switch (phaseStatuses.export) {
      case "pending":
        return t("phases.export.pending")
      case "processing":
        return t("phases.export.processing")
      case "completed":
        return t("phases.export.completed")
      case "failed":
        return t("phases.export.failed")
      default:
        return t("phases.export.title")
    }
  }

  const phases: Phase[] = [
    {
      id: "extraction",
      title: t("phases.extraction.title"),
      status: phaseStatuses.extraction,
      description: getExtractionDescription(),
      timestamp: showTimestamps ? contentExtractedAt : null,
    },
    {
      id: "generation",
      title: t("phases.generation.title"),
      status: phaseStatuses.generation,
      description: getGenerationDescription(),
      timestamp:
        showTimestamps &&
        (phaseStatuses.generation === "completed" ||
          phaseStatuses.generation === "partial")
          ? lastStatusUpdate
          : null,
    },
    {
      id: "export",
      title: t("phases.export.title"),
      status: phaseStatuses.export,
      description: getExportDescription(),
      timestamp: showTimestamps ? exportedAt : null,
    },
  ]

  return (
    <VStack gap={4} align="stretch">
      {phases.map((phase, index) => (
        <PhaseItem
          key={phase.id}
          phase={phase}
          isLast={index === phases.length - 1}
        />
      ))}
    </VStack>
  )
}
