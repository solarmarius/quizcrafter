import { Box, Text } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface CorrectAnswerBoxProps {
  correctAnswer: string
  answerVariations?: string[]
}

export const CorrectAnswerBox = memo(function CorrectAnswerBox({
  correctAnswer,
  answerVariations,
}: CorrectAnswerBoxProps) {
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
        {t("questions.editor.correctAnswer")}:
      </Text>
      <Text fontSize="sm" color="green.600" fontFamily="mono">
        {correctAnswer}
      </Text>
      {answerVariations && answerVariations.length > 0 && (
        <>
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="green.700"
            mt={2}
            mb={1}
          >
            {t("questions.editor.acceptedVariations")}:
          </Text>
          <Text fontSize="sm" color="green.600" fontFamily="mono">
            {answerVariations.join(", ")}
          </Text>
        </>
      )}
    </Box>
  )
})
