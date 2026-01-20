import { Box, Text, VStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface BlankData {
  position: number
  correct_answer: string
  answer_variations?: string[]
  case_sensitive?: boolean
}

interface FillInBlankAnswersBoxProps {
  blanks: BlankData[]
}

export const FillInBlankAnswersBox = memo(function FillInBlankAnswersBox({
  blanks,
}: FillInBlankAnswersBoxProps) {
  const { t } = useTranslation("quiz")

  return (
    <Box
      p={3}
      bg="green.50"
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="green.200"
    >
      <Text fontSize="sm" fontWeight="medium" color="green.700" mb={2}>
        {t("questions.correctAnswersLabel")}
      </Text>
      <VStack gap={2} align="stretch">
        {blanks.map((blank, index) => (
          <Box key={index}>
            <Text fontSize="sm" color="green.600">
              <strong>
                {t("questions.blankPosition", { position: blank.position })}
              </strong>{" "}
              <Text as="span" fontFamily="mono">
                {blank.correct_answer}
              </Text>
            </Text>
            {blank.answer_variations && blank.answer_variations.length > 0 && (
              <Text fontSize="xs" color="green.500" ml={4}>
                {t("questions.variationsLabel")}{" "}
                {blank.answer_variations.join(", ")}
              </Text>
            )}
            {blank.case_sensitive && (
              <Text fontSize="xs" color="orange.600" ml={4}>
                {t("questions.editor.caseSensitive")}
              </Text>
            )}
          </Box>
        ))}
      </VStack>
    </Box>
  )
})
