import { Button, ButtonGroup, Text, Textarea, VStack } from "@chakra-ui/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"
import { Radio, RadioGroup } from "@/components/ui/radio"

/**
 * Rejection reasons matching the backend RejectionReason enum
 */
export const REJECTION_REASONS = {
  INCORRECT_ANSWER: "incorrect_answer",
  POOR_WORDING: "poor_wording",
  IRRELEVANT_CONTENT: "irrelevant_content",
  DUPLICATE_QUESTION: "duplicate_question",
  TOO_EASY: "too_easy",
  TOO_HARD: "too_hard",
  QUOTA_REACHED: "quota_reached",
  TOPIC_COVERAGE: "topic_coverage",
  OTHER: "other",
} as const

export type RejectionReason =
  (typeof REJECTION_REASONS)[keyof typeof REJECTION_REASONS]

interface RejectionFeedbackDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback when rejection is confirmed with reason and optional feedback */
  onReject: (reason: RejectionReason, feedback?: string) => void
  /** Whether the rejection is in progress */
  isLoading: boolean
  /** Number of questions being rejected in bulk mode (undefined for single question) */
  bulkCount?: number
}

/**
 * Dialog for collecting feedback when rejecting a question.
 * Displays radio buttons for predefined rejection reasons and
 * an optional textarea for additional feedback.
 */
export function RejectionFeedbackDialog({
  isOpen,
  onClose,
  onReject,
  isLoading,
  bulkCount,
}: RejectionFeedbackDialogProps) {
  const { t } = useTranslation("quiz")
  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(
    null,
  )
  const [feedback, setFeedback] = useState("")

  const isBulkMode = bulkCount !== undefined && bulkCount > 0

  const handleSubmit = () => {
    if (!selectedReason) return
    onReject(selectedReason, feedback.trim() || undefined)
  }

  const handleClose = () => {
    // Reset state when closing
    setSelectedReason(null)
    setFeedback("")
    onClose()
  }

  const dialogTitle = isBulkMode
    ? t("questions.bulk.rejectDialogTitle", { count: bulkCount })
    : t("questions.rejection.dialogTitle")

  const dialogPrompt = isBulkMode
    ? t("questions.bulk.rejectDialogMessage", { count: bulkCount })
    : t("questions.rejection.prompt")

  const reasonLabels: Record<RejectionReason, string> = {
    [REJECTION_REASONS.INCORRECT_ANSWER]: t(
      "questions.rejection.reasons.incorrect_answer",
    ),
    [REJECTION_REASONS.POOR_WORDING]: t(
      "questions.rejection.reasons.poor_wording",
    ),
    [REJECTION_REASONS.IRRELEVANT_CONTENT]: t(
      "questions.rejection.reasons.irrelevant_content",
    ),
    [REJECTION_REASONS.DUPLICATE_QUESTION]: t(
      "questions.rejection.reasons.duplicate_question",
    ),
    [REJECTION_REASONS.TOO_EASY]: t("questions.rejection.reasons.too_easy"),
    [REJECTION_REASONS.TOO_HARD]: t("questions.rejection.reasons.too_hard"),
    [REJECTION_REASONS.QUOTA_REACHED]: t(
      "questions.rejection.reasons.quota_reached",
    ),
    [REJECTION_REASONS.TOPIC_COVERAGE]: t(
      "questions.rejection.reasons.topic_coverage",
    ),
    [REJECTION_REASONS.OTHER]: t("questions.rejection.reasons.other"),
  }

  const reasonOptions = Object.values(REJECTION_REASONS)

  return (
    <DialogRoot
      size={{ base: "sm", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        if (!open) handleClose()
      }}
      closeOnInteractOutside={!isLoading}
    >
      <DialogContent>
        <DialogCloseTrigger disabled={isLoading} />
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text>{dialogPrompt}</Text>

            <RadioGroup
              value={selectedReason ?? undefined}
              onValueChange={({ value }) =>
                setSelectedReason(value as RejectionReason)
              }
            >
              <VStack gap={2} align="stretch">
                {reasonOptions.map((reason) => (
                  <Radio key={reason} value={reason}>
                    {reasonLabels[reason]}
                  </Radio>
                ))}
              </VStack>
            </RadioGroup>

            <VStack gap={1} align="stretch">
              <Text fontSize="sm" color="fg.muted">
                {t("questions.rejection.feedbackLabel")}
              </Text>
              <Textarea
                placeholder={t("questions.rejection.feedbackPlaceholder")}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </VStack>
          </VStack>
        </DialogBody>

        <DialogFooter gap={2}>
          <ButtonGroup>
            <DialogActionTrigger asChild>
              <Button variant="subtle" colorPalette="gray" disabled={isLoading}>
                {t("questions.rejection.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              colorPalette="red"
              onClick={handleSubmit}
              loading={isLoading}
              disabled={!selectedReason}
            >
              {t("questions.rejection.confirm")}
            </Button>
          </ButtonGroup>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
