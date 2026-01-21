import { Box, Text } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface ExplanationBoxProps {
  explanation: string
}

export const ExplanationBox = memo(function ExplanationBox({
  explanation,
}: ExplanationBoxProps) {
  const { t } = useTranslation("quiz")

  return (
    <Box
      p={3}
      bg="blue.50"
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="blue.200"
    >
      <Text fontSize="sm" fontWeight="medium" color="blue.700" mb={1}>
        {t("questions.explanationLabel")}
      </Text>
      <Text fontSize="sm" color="blue.600">
        {explanation}
      </Text>
    </Box>
  )
})
