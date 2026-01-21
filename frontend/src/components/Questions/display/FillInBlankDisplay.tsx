import type { QuestionResponse } from "@/client"
import { ErrorState } from "@/components/Common"
import { extractQuestionData } from "@/types/questionTypes"
import { Box, Text, VStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"
import { ExplanationBox } from "../shared/ExplanationBox"
import { FillInBlankAnswersBox } from "../shared/FillInBlankAnswersBox"

interface FillInBlankDisplayProps {
  question: QuestionResponse
  showCorrectAnswer: boolean
}

export const FillInBlankDisplay = memo(function FillInBlankDisplay({
  question,
  showCorrectAnswer,
}: FillInBlankDisplayProps) {
  const { t } = useTranslation("quiz")

  try {
    const fibData = extractQuestionData(question, "fill_in_blank")

    return (
      <VStack gap={4} align="stretch">
        <Box>
          <Text fontSize="md" fontWeight="medium" mb={2}>
            {fibData.question_text}
          </Text>
        </Box>

        {showCorrectAnswer && <FillInBlankAnswersBox blanks={fibData.blanks} />}

        {fibData.explanation && (
          <ExplanationBox explanation={fibData.explanation} />
        )}
      </VStack>
    )
  } catch (error) {
    return (
      <ErrorState
        title={t("questions.displayError")}
        message={t("questions.loadingError")}
        variant="inline"
        showRetry={false}
      />
    )
  }
})
