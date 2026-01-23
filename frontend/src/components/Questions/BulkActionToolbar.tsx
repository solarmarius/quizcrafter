import { Badge, Box, Button, HStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"
import { MdCheck, MdClose } from "react-icons/md"

/**
 * Props for the BulkActionToolbar component.
 * Displays bulk action buttons when questions are selected.
 */
interface BulkActionToolbarProps {
  /** Number of questions currently selected */
  selectedCount: number
  /** Callback when approve selected is clicked */
  onApproveSelected: () => void
  /** Callback when reject selected is clicked */
  onRejectSelected: () => void
  /** Callback when clear selection is clicked */
  onClearSelection: () => void
  /** Whether the approve operation is in progress */
  isApproving: boolean
  /** Whether the reject operation is in progress */
  isRejecting: boolean
  /** Whether the quiz is published (disables actions) */
  isPublished?: boolean
}

/**
 * Toolbar component for bulk question operations.
 * Shows selection count and action buttons for approve/reject multiple questions.
 *
 * @example
 * ```tsx
 * <BulkActionToolbar
 *   selectedCount={5}
 *   totalVisible={20}
 *   onApproveSelected={() => bulkApproveMutation.mutate()}
 *   onRejectSelected={() => setShowBulkRejectDialog(true)}
 *   onSelectAllVisible={() => selectAll(visibleIds)}
 *   onClearSelection={clearSelection}
 *   isApproving={bulkApproveMutation.isPending}
 *   isRejecting={bulkDeleteMutation.isPending}
 * />
 * ```
 */
export const BulkActionToolbar = memo(function BulkActionToolbar({
  selectedCount,
  onApproveSelected,
  onRejectSelected,
  onClearSelection,
  isApproving,
  isRejecting,
  isPublished = false,
}: BulkActionToolbarProps) {
  const { t } = useTranslation("quiz")

  const isLoading = isApproving || isRejecting

  // Don't render if no selection
  if (selectedCount === 0) {
    return null
  }

  return (
    <Box
      p={3}
      bg="blue.50"
      borderRadius="md"
      border="1px solid"
      borderColor="blue.200"
    >
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <HStack gap={3}>
          <Badge colorPalette="blue" size="lg" px={3} py={1}>
            {t("questions.bulk.selected", { count: selectedCount })}
          </Badge>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isLoading}
          >
            {t("questions.bulk.clearSelection")}
          </Button>
        </HStack>

        <HStack gap={2}>
          <Button
            size="sm"
            colorPalette="green"
            onClick={onApproveSelected}
            loading={isApproving}
            disabled={isRejecting || isPublished}
          >
            <MdCheck />
            {t("questions.bulk.approveSelected")}
          </Button>

          <Button
            size="sm"
            colorPalette="red"
            variant="outline"
            onClick={onRejectSelected}
            loading={isRejecting}
            disabled={isApproving || isPublished}
          >
            <MdClose />
            {t("questions.bulk.rejectSelected")}
          </Button>
        </HStack>
      </HStack>
    </Box>
  )
})
