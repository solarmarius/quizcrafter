import { Box, Text } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface SampleAnswerBoxProps {
  sampleAnswer: string
}

export const SampleAnswerBox = memo(function SampleAnswerBox({
  sampleAnswer,
}: SampleAnswerBoxProps) {
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
        {t("questions.sampleAnswer")}
      </Text>
      <Text fontSize="sm" color="blue.600" whiteSpace="pre-wrap">
        {sampleAnswer}
      </Text>
    </Box>
  )
})
