import type { QuestionResponse, QuestionUpdateRequest } from "@/client"
import { FormField, FormGroup } from "@/components/forms"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { type MCQFormData, mcqSchema } from "@/lib/validation"
import { extractQuestionData } from "@/types/questionTypes"
import {
  Button,
  Fieldset,
  HStack,
  Input,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { memo } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ErrorEditor } from "./ErrorEditor"

interface MCQEditorProps {
  question: QuestionResponse
  onSave: (updateData: QuestionUpdateRequest) => void
  onCancel: () => void
  isLoading: boolean
}

export const MCQEditor = memo(function MCQEditor({
  question,
  onSave,
  onCancel,
  isLoading,
}: MCQEditorProps) {
  const { t } = useTranslation("quiz")

  try {
    const mcqData = extractQuestionData(question, "multiple_choice")

    const {
      control,
      handleSubmit,
      formState: { errors, isDirty },
    } = useForm<MCQFormData>({
      resolver: zodResolver(mcqSchema),
      defaultValues: {
        questionText: mcqData.question_text,
        optionA: mcqData.option_a,
        optionB: mcqData.option_b,
        optionC: mcqData.option_c,
        optionD: mcqData.option_d,
        correctAnswer: mcqData.correct_answer,
        explanation: mcqData.explanation || "",
      },
    })

    const onSubmit = (data: MCQFormData) => {
      const updateData: QuestionUpdateRequest = {
        question_data: {
          question_text: data.questionText,
          option_a: data.optionA,
          option_b: data.optionB,
          option_c: data.optionC,
          option_d: data.optionD,
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
              <Textarea {...field} rows={3} />
            </FormField>
          )}
        />

        <Fieldset.Root>
          <Fieldset.Legend>
            {t("questions.editor.answerOptions")}
          </Fieldset.Legend>
          <VStack gap={3} align="stretch">
            <Controller
              name="optionA"
              control={control}
              render={({ field }) => (
                <FormField
                  label={t("questions.editor.optionA")}
                  isRequired
                  error={errors.optionA?.message}
                >
                  <Input {...field} />
                </FormField>
              )}
            />
            <Controller
              name="optionB"
              control={control}
              render={({ field }) => (
                <FormField
                  label={t("questions.editor.optionB")}
                  isRequired
                  error={errors.optionB?.message}
                >
                  <Input {...field} />
                </FormField>
              )}
            />
            <Controller
              name="optionC"
              control={control}
              render={({ field }) => (
                <FormField
                  label={t("questions.editor.optionC")}
                  isRequired
                  error={errors.optionC?.message}
                >
                  <Input {...field} />
                </FormField>
              )}
            />
            <Controller
              name="optionD"
              control={control}
              render={({ field }) => (
                <FormField
                  label={t("questions.editor.optionD")}
                  isRequired
                  error={errors.optionD?.message}
                >
                  <Input {...field} />
                </FormField>
              )}
            />
          </VStack>
        </Fieldset.Root>

        <Controller
          name="correctAnswer"
          control={control}
          render={({ field: { onChange, value } }) => (
            <FormField
              label={t("questions.editor.correctAnswer")}
              isRequired
              error={errors.correctAnswer?.message}
            >
              <RadioGroup
                value={value}
                onValueChange={(details) =>
                  onChange(details.value as "A" | "B" | "C" | "D")
                }
              >
                <HStack gap={4}>
                  <Radio value="A">A</Radio>
                  <Radio value="B">B</Radio>
                  <Radio value="C">C</Radio>
                  <Radio value="D">D</Radio>
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
              label={t("questions.editor.explanation")}
              error={errors.explanation?.message}
            >
              <Textarea {...field} rows={2} />
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
    return (
      <ErrorEditor
        error="Error loading MCQ question data"
        onCancel={onCancel}
      />
    )
  }
})
