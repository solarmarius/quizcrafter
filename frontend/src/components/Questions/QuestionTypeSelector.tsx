import { Box, Card, SimpleGrid, Text, VStack } from "@chakra-ui/react"
import { memo, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { QUESTION_TYPES } from "@/lib/constants"

interface QuestionTypeSelectorProps {
  /** Callback when a question type is selected */
  onSelectType: (questionType: string) => void
  /** Whether the selection process is loading */
  isLoading?: boolean
}

/**
 * Question type selector component that displays all available question types
 * as selectable cards. This is the first step in the manual question creation workflow.
 *
 * @example
 * ```tsx
 * <QuestionTypeSelector
 *   onSelectType={(type) => setSelectedType(type)}
 *   isLoading={false}
 * />
 * ```
 */
export const QuestionTypeSelector = memo(function QuestionTypeSelector({
  onSelectType,
  isLoading = false,
}: QuestionTypeSelectorProps) {
  const { t } = useTranslation("quiz")

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, questionType: string) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        if (!isLoading) {
          onSelectType(questionType)
        }
      }
    },
    [onSelectType, isLoading],
  )

  // Define question types with icons, using translated labels and descriptions
  const questionTypeOptions = [
    { type: QUESTION_TYPES.MULTIPLE_CHOICE, icon: "📝" },
    { type: QUESTION_TYPES.TRUE_FALSE, icon: "✓✗" },
    { type: QUESTION_TYPES.FILL_IN_BLANK, icon: "📄" },
    { type: QUESTION_TYPES.MATCHING, icon: "🔗" },
    { type: QUESTION_TYPES.CATEGORIZATION, icon: "📊" },
  ]

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          {t("questionSelector.title")}
        </Text>
        <Text color="gray.600">{t("questionSelector.description")}</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {questionTypeOptions.map((option) => {
          const label = t(`questionTypes.${option.type}`)
          const description = t(`questionTypeDescriptions.${option.type}`)
          return (
            <Card.Root
              key={option.type}
              variant="outline"
              cursor="pointer"
              transition="all 0.2s"
              tabIndex={0}
              role="button"
              aria-label={t("questionSelector.selectAriaLabel", {
                type: label,
              })}
              _hover={{
                borderColor: "blue.300",
                shadow: "md",
              }}
              _focus={{
                borderColor: "blue.500",
                shadow: "outline",
                outline: "2px solid",
                outlineColor: "blue.500",
                outlineOffset: "2px",
              }}
              onClick={() => !isLoading && onSelectType(option.type)}
              onKeyDown={(e) => handleKeyDown(e, option.type)}
              opacity={isLoading ? 0.6 : 1}
              aria-disabled={isLoading}
            >
              <Card.Body p={4}>
                <VStack gap={3} align="center" textAlign="center">
                  <Text fontSize="2xl" role="img" aria-label={label}>
                    {option.icon}
                  </Text>
                  <Text fontWeight="semibold" fontSize="md">
                    {label}
                  </Text>
                  <Text fontSize="sm" color="gray.600" lineHeight="1.4">
                    {description}
                  </Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          )
        })}
      </SimpleGrid>
    </VStack>
  )
})
