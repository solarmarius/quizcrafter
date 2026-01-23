import type { QuestionResponse } from "@/client"
import { ErrorState } from "@/components/Common"
import { extractQuestionData } from "@/types/questionTypes"
import { Badge, Box, HStack, Icon, Text, VStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"
import { LuSquare, LuSquareCheck } from "react-icons/lu"
import { ExplanationBox } from "../shared/ExplanationBox"

interface MultipleAnswerDisplayProps {
  question: QuestionResponse
  showCorrectAnswer: boolean
}

export const MultipleAnswerDisplay = memo(function MultipleAnswerDisplay({
  question,
  showCorrectAnswer,
}: MultipleAnswerDisplayProps) {
  const { t } = useTranslation("quiz")

  try {
    const data = extractQuestionData(question, "multiple_answer")

    const options = [
      { key: "A" as const, text: data.option_a },
      { key: "B" as const, text: data.option_b },
      { key: "C" as const, text: data.option_c },
      { key: "D" as const, text: data.option_d },
      { key: "E" as const, text: data.option_e },
    ]

    const isCorrect = (key: string) =>
      data.correct_answers.includes(key as "A" | "B" | "C" | "D" | "E")

    return (
      <VStack gap={4} align="stretch">
        <Box>
          <Text fontSize="md" fontWeight="medium" mb={1}>
            {data.question_text}
          </Text>
          <Text fontSize="sm" color="gray.500" fontStyle="italic">
            {t("questions.selectAllThatApply")}
          </Text>
        </Box>

        <VStack gap={2} align="stretch">
          {options.map((option) => {
            const correct = isCorrect(option.key)
            const highlighted = showCorrectAnswer && correct

            return (
              <HStack
                key={option.key}
                p={3}
                bg={highlighted ? "green.50" : "gray.50"}
                borderRadius="md"
                border={highlighted ? "2px solid" : "1px solid"}
                borderColor={highlighted ? "green.200" : "gray.200"}
              >
                <Icon
                  as={highlighted ? LuSquareCheck : LuSquare}
                  color={highlighted ? "green.500" : "gray.400"}
                  boxSize={5}
                />
                <Badge
                  colorScheme={highlighted ? "green" : "gray"}
                  variant="solid"
                  size="sm"
                >
                  {option.key}
                </Badge>
                <Text flex={1}>{option.text}</Text>
                {highlighted && (
                  <Badge colorScheme="green" variant="subtle" size="sm">
                    {t("questions.correct")}
                  </Badge>
                )}
              </HStack>
            )
          })}
        </VStack>

        {showCorrectAnswer && (
          <Text fontSize="sm" color="gray.600">
            {t("questions.correctAnswersCount", {
              count: data.correct_answers.length,
            })}
            :{" "}
            <Text as="span" fontWeight="semibold">
              {data.correct_answers.join(", ")}
            </Text>
          </Text>
        )}

        {data.explanation && <ExplanationBox explanation={data.explanation} />}
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
