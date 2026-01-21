import type { QuestionResponse } from "@/client"
import { ErrorState } from "@/components/Common"
import { extractQuestionData } from "@/types/questionTypes"
import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"
import { ExplanationBox } from "../shared/ExplanationBox"

interface TrueFalseDisplayProps {
  question: QuestionResponse
  showCorrectAnswer: boolean
}

export const TrueFalseDisplay = memo(function TrueFalseDisplay({
  question,
  showCorrectAnswer,
}: TrueFalseDisplayProps) {
  const { t } = useTranslation("quiz")

  try {
    const trueFalseData = extractQuestionData(question, "true_false")

    return (
      <VStack gap={4} align="stretch">
        <Box>
          <Text fontSize="md" fontWeight="medium">
            {trueFalseData.question_text}
          </Text>
        </Box>

        <HStack gap={4} justify="center">
          {/* True Box */}
          <Box
            flex={1}
            p={3}
            borderWidth={1}
            borderRadius="md"
            borderColor={
              showCorrectAnswer && trueFalseData.correct_answer
                ? "blue.400"
                : "gray.200"
            }
            bg={
              showCorrectAnswer && trueFalseData.correct_answer
                ? "blue.50"
                : "gray.50"
            }
            textAlign="center"
          >
            <Text fontSize="sm">{t("questions.editor.true")}</Text>
          </Box>

          {/* False Box */}
          <Box
            flex={1}
            p={3}
            borderWidth={1}
            borderRadius="md"
            borderColor={
              showCorrectAnswer && !trueFalseData.correct_answer
                ? "blue.400"
                : "gray.200"
            }
            bg={
              showCorrectAnswer && !trueFalseData.correct_answer
                ? "blue.50"
                : "gray.50"
            }
            textAlign="center"
          >
            <Text fontSize="sm">{t("questions.editor.false")}</Text>
          </Box>
        </HStack>

        {trueFalseData.explanation && (
          <ExplanationBox explanation={trueFalseData.explanation} />
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
