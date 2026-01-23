import type { QuestionResponse, QuestionUpdateRequest } from "@/client"
import { FormField, FormGroup } from "@/components/forms"
import { Checkbox } from "@/components/ui/checkbox"
import {
  type MultipleAnswerFormData,
  multipleAnswerSchema,
} from "@/lib/validation"
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

interface MultipleAnswerEditorProps {
  question: QuestionResponse
  onSave: (updateData: QuestionUpdateRequest) => void
  onCancel: () => void
  isLoading: boolean
}

type AnswerLetter = "A" | "B" | "C" | "D" | "E"

export const MultipleAnswerEditor = memo(function MultipleAnswerEditor({
  question,
  onSave,
  onCancel,
  isLoading,
}: MultipleAnswerEditorProps) {
  const { t } = useTranslation(["quiz", "validation"])

  try {
    const data = extractQuestionData(question, "multiple_answer")

    const {
      control,
      handleSubmit,
      formState: { errors, isDirty },
    } = useForm<MultipleAnswerFormData>({
      resolver: zodResolver(multipleAnswerSchema),
      defaultValues: {
        questionText: data.question_text,
        optionA: data.option_a,
        optionB: data.option_b,
        optionC: data.option_c,
        optionD: data.option_d,
        optionE: data.option_e,
        correctAnswers: data.correct_answers,
        explanation: data.explanation || "",
      },
    })

    const onSubmit = (formData: MultipleAnswerFormData) => {
      const updateData: QuestionUpdateRequest = {
        question_data: {
          question_text: formData.questionText,
          option_a: formData.optionA,
          option_b: formData.optionB,
          option_c: formData.optionC,
          option_d: formData.optionD,
          option_e: formData.optionE,
          correct_answers: formData.correctAnswers,
          explanation: formData.explanation || null,
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
            <Controller
              name="optionE"
              control={control}
              render={({ field }) => (
                <FormField
                  label={t("questions.editor.optionE")}
                  isRequired
                  error={errors.optionE?.message}
                >
                  <Input {...field} />
                </FormField>
              )}
            />
          </VStack>
        </Fieldset.Root>

        <Controller
          name="correctAnswers"
          control={control}
          render={({ field: { onChange, value } }) => (
            <FormField
              label={t("questions.editor.correctAnswers")}
              helperText={t("questions.editor.correctAnswersHelp")}
              isRequired
              error={errors.correctAnswers?.message}
            >
              <HStack gap={4}>
                {(["A", "B", "C", "D", "E"] as const).map((letter) => (
                  <Checkbox
                    key={letter}
                    checked={value.includes(letter)}
                    onCheckedChange={(details) => {
                      const isChecked = details.checked === true
                      const newValue = isChecked
                        ? [...value, letter].sort()
                        : value.filter((v: AnswerLetter) => v !== letter)
                      onChange(newValue)
                    }}
                  >
                    {letter}
                  </Checkbox>
                ))}
              </HStack>
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
        error={t("validation:editors.multipleAnswerLoadError")}
        onCancel={onCancel}
      />
    )
  }
})
