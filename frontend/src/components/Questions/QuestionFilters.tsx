import {
  Badge,
  Box,
  Button,
  HStack,
  Popover,
  Portal,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"
import { MdFilterList } from "react-icons/md"

import type { QuestionType } from "@/client"

/**
 * Props for the QuestionFilters component
 */
interface QuestionFiltersProps {
  /** Available modules to filter by */
  availableModules: Array<{ id: string; name: string }>
  /** Currently selected module IDs (empty = all) */
  selectedModuleIds: Set<string>
  /** Callback when module selection changes */
  onModuleFilterChange: (moduleIds: Set<string>) => void
  /** Available question types to filter by */
  availableQuestionTypes: QuestionType[]
  /** Currently selected question types (empty = all) */
  selectedQuestionTypes: Set<QuestionType>
  /** Callback when question type selection changes */
  onQuestionTypeFilterChange: (types: Set<QuestionType>) => void
  /** Total number of questions before filtering */
  totalCount: number
  /** Number of questions after applying filters */
  filteredCount: number
}

/**
 * Filter dropdown for questions by module and question type.
 * Uses a popover with multi-select button toggles.
 */
export const QuestionFilters = memo(function QuestionFilters({
  availableModules,
  selectedModuleIds,
  onModuleFilterChange,
  availableQuestionTypes,
  selectedQuestionTypes,
  onQuestionTypeFilterChange,
  totalCount,
  filteredCount,
}: QuestionFiltersProps) {
  const { t } = useTranslation("quiz")

  const toggleModule = (moduleId: string) => {
    const newSet = new Set(selectedModuleIds)
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId)
    } else {
      newSet.add(moduleId)
    }
    onModuleFilterChange(newSet)
  }

  const toggleQuestionType = (type: QuestionType) => {
    const newSet = new Set(selectedQuestionTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    onQuestionTypeFilterChange(newSet)
  }

  const clearFilters = () => {
    onModuleFilterChange(new Set())
    onQuestionTypeFilterChange(new Set())
  }

  const activeFilterCount = selectedModuleIds.size + selectedQuestionTypes.size
  const hasActiveFilters = activeFilterCount > 0

  // Don't render if no filtering options available
  if (availableModules.length <= 1 && availableQuestionTypes.length <= 1) {
    return null
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline" size="sm">
          <MdFilterList />
          {t("questions.filters.filterButton")}
          {hasActiveFilters && (
            <Badge colorPalette="blue" borderRadius="full" ml={1}>
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="auto" maxW="400px">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body p={4}>
              <VStack align="stretch" gap={4}>
                {/* Module Filter */}
                {availableModules.length > 1 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      {t("questions.filters.byModule")}
                    </Text>
                    <Wrap gap={2}>
                      {availableModules.map((module) => (
                        <Button
                          key={module.id}
                          size="xs"
                          variant={
                            selectedModuleIds.has(module.id)
                              ? "solid"
                              : "outline"
                          }
                          colorPalette="blue"
                          onClick={() => toggleModule(module.id)}
                        >
                          {module.name}
                        </Button>
                      ))}
                    </Wrap>
                  </Box>
                )}

                {/* Question Type Filter */}
                {availableQuestionTypes.length > 1 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      {t("questions.filters.byType")}
                    </Text>
                    <Wrap gap={2}>
                      {availableQuestionTypes.map((type) => (
                        <Button
                          key={type}
                          size="xs"
                          variant={
                            selectedQuestionTypes.has(type)
                              ? "solid"
                              : "outline"
                          }
                          colorPalette="blue"
                          onClick={() => toggleQuestionType(type)}
                        >
                          {t(`questionTypes.${type}`)}
                        </Button>
                      ))}
                    </Wrap>
                  </Box>
                )}

                {/* Filter Summary & Clear */}
                {hasActiveFilters && (
                  <HStack justify="space-between" pt={2} borderTopWidth="1px">
                    <Badge colorPalette="blue" variant="subtle">
                      {t("questions.filters.showing", {
                        count: filteredCount,
                        total: totalCount,
                      })}
                    </Badge>
                    <Button size="xs" variant="ghost" onClick={clearFilters}>
                      {t("questions.filters.clearAll")}
                    </Button>
                  </HStack>
                )}
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
})
