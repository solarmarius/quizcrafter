import { Box, Text } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface GradingRubricBoxProps {
  rubric: string
}

export const GradingRubricBox = memo(function GradingRubricBox({
  rubric,
}: GradingRubricBoxProps) {
  const { t } = useTranslation("quiz")

  return (
    <Box
      p={3}
      bg="green.50"
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="green.200"
    >
      <Text fontSize="sm" fontWeight="medium" color="green.700" mb={1}>
        {t("questions.gradingRubric")}
      </Text>
      <Text fontSize="sm" color="green.600" whiteSpace="pre-wrap">
        {rubric}
      </Text>
    </Box>
  )
})
