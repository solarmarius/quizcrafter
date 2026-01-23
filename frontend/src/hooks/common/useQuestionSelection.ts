import { useCallback, useMemo, useState } from "react"

/**
 * Hook for managing multi-select state for questions.
 * Provides methods for toggling, selecting all, and clearing selections.
 *
 * @returns Object containing selection state and control methods
 * @returns {Set<string>} returns.selectedIds - Set of currently selected question IDs
 * @returns {number} returns.selectionCount - Number of selected questions
 * @returns {function} returns.isSelected - Check if a question is selected
 * @returns {function} returns.toggle - Toggle selection of a question
 * @returns {function} returns.selectAll - Select multiple questions
 * @returns {function} returns.clearSelection - Clear all selections
 * @returns {function} returns.getSelectedIds - Get array of selected IDs
 *
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   selectionCount,
 *   isSelected,
 *   toggle,
 *   selectAll,
 *   clearSelection,
 * } = useQuestionSelection()
 *
 * // Toggle a question
 * <Checkbox checked={isSelected(question.id)} onChange={() => toggle(question.id)} />
 *
 * // Select all visible questions
 * <Button onClick={() => selectAll(visibleQuestions.map(q => q.id))}>
 *   Select All ({selectionCount} selected)
 * </Button>
 *
 * // Clear selection
 * <Button onClick={clearSelection}>Clear</Button>
 * ```
 */
export function useQuestionSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const selectionCount = useMemo(() => selectedIds.size, [selectedIds])

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  )

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const getSelectedIds = useCallback(
    () => Array.from(selectedIds),
    [selectedIds],
  )

  return {
    selectedIds,
    selectionCount,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    getSelectedIds,
  }
}
