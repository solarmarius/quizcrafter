import type { QuestionResponse, QuestionUpdateRequest } from "@/client"
import { FormField, FormGroup } from "@/components/forms"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { type TrueFalseFormData, trueFalseSchema } from "@/lib/validation"
import { extractQuestionData } from "@/types/questionTypes"
import { Button, HStack, Textarea } from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { memo } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ErrorEditor } from "./ErrorEditor"

interface TrueFalseEditorProps {
  question: QuestionResponse
  onSave: (updateData: QuestionUpdateRequest) => void
  onCancel: () => void
  isLoading: boolean
}

export const TrueFalseEditor = memo(function TrueFalseEditor({
  question,
  onSave,
  onCancel,
  isLoading,
}: TrueFalseEditorProps) {
  const { t } = useTranslation("quiz")

  try {
    const trueFalseData = extractQuestionData(question, "true_false")

    const {
      control,
      handleSubmit,
      formState: { errors, isDirty },
    } = useForm<TrueFalseFormData>({
      resolver: zodResolver(trueFalseSchema),
      defaultValues: {
        questionText: trueFalseData.question_text,
        correctAnswer: trueFalseData.correct_answer,
        explanation: trueFalseData.explanation || "",
      },
    })

    const onSubmit = (data: TrueFalseFormData) => {
      const updateData: QuestionUpdateRequest = {
        question_data: {
          question_text: data.questionText,
          correct_answer: data.correctAnswer,
          explanation: data.explanation || null,
        },
      }
      onSave(updateData)
    }

    return (
      <FormGroup>
        <Controller
          name="questionText"
          control={control}
          render={({ field }) => (
            <FormField
              label={t("questions.editor.questionText")}
              isRequired
              error={errors.questionText?.message}
            >
              <Textarea
                {...field}
                placeholder="Enter your true/false statement..."
                rows={3}
              />
            </FormField>
          )}
        />

        <Controller
          name="correctAnswer"
          control={control}
          render={({ field: { value, onChange } }) => (
            <FormField
              label={t("questions.editor.correctAnswer")}
              isRequired
              error={errors.correctAnswer?.message}
            >
              <RadioGroup
                value={value?.toString()}
                onValueChange={(details) => {
                  onChange(details.value === "true")
                }}
              >
                <HStack gap={4}>
                  <Radio value="true">{t("questions.editor.true")}</Radio>
                  <Radio value="false">{t("questions.editor.false")}</Radio>
                </HStack>
              </RadioGroup>
            </FormField>
          )}
        />

        <Controller
          name="explanation"
          control={control}
          render={({ field }) => (
            <FormField
              label={t("questions.editor.explanationOptional")}
              error={errors.explanation?.message}
            >
              <Textarea
                {...field}
                placeholder="Optional explanation for the correct answer..."
                rows={3}
              />
            </FormField>
          )}
        />

        <HStack gap={3} justify="end">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t("questions.editor.cancel")}
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={!isDirty}
          >
            {t("questions.editor.saveChanges")}
          </Button>
        </HStack>
      </FormGroup>
    )
  } catch (error) {
    console.error("Error rendering true/false question editor:", error)
    return (
      <ErrorEditor
        error="Error loading question data for editing"
        onCancel={onCancel}
      />
    )
  }
})
