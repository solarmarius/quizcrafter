import type { QuestionResponse, QuestionUpdateRequest } from "@/client"
import { FormField, FormGroup } from "@/components/forms"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getNextBlankPosition,
  validateBlankTextComprehensive,
} from "@/lib/utils/fillInBlankUtils"
import { type FillInBlankFormData, fillInBlankSchema } from "@/lib/validation"
import type { BlankValidationError } from "@/types/fillInBlankValidation"
import { BlankValidationErrorCode } from "@/types/fillInBlankValidation"
import { extractQuestionData } from "@/types/questionTypes"
import {
  Box,
  Button,
  Fieldset,
  HStack,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { memo, useMemo } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ErrorEditor } from "./ErrorEditor"
import { FillInBlankValidationErrors } from "./FillInBlankValidationErrors"

interface FillInBlankEditorProps {
  question: QuestionResponse
  onSave: (updateData: QuestionUpdateRequest) => void
  onCancel: () => void
  isLoading: boolean
}

export const FillInBlankEditor = memo(function FillInBlankEditor({
  question,
  onSave,
  onCancel,
  isLoading,
}: FillInBlankEditorProps) {
  const { t } = useTranslation(["quiz", "validation"])

  try {
    const fibData = extractQuestionData(question, "fill_in_blank")

    const {
      control,
      handleSubmit,
      formState: { errors, isDirty, isValid },
    } = useForm<FillInBlankFormData>({
      resolver: zodResolver(fillInBlankSchema),
      mode: "onChange", // Enable real-time validation
      defaultValues: {
        questionText: fibData.question_text,
        blanks: fibData.blanks.map((blank) => ({
          position: blank.position,
          correctAnswer: blank.correct_answer,
          answerVariations: blank.answer_variations?.join(", ") || "",
          caseSensitive: blank.case_sensitive || false,
        })),
        explanation: fibData.explanation || "",
      },
    })

    // Watch question text and blanks for real-time validation
    const watchedQuestionText = useWatch({ control, name: "questionText" })
    const watchedBlanks = useWatch({ control, name: "blanks" })

    const { fields, append, remove } = useFieldArray({
      control,
      name: "blanks",
    })

    const onSubmit = (data: FillInBlankFormData) => {
      const updateData: QuestionUpdateRequest = {
        question_data: {
          question_text: data.questionText,
          blanks: data.blanks.map((blank) => ({
            position: blank.position,
            correct_answer: blank.correctAnswer,
            answer_variations: blank.answerVariations
              ? blank.answerVariations
                  .split(",")
                  .map((v) => v.trim())
                  .filter((v) => v)
              : undefined,
            case_sensitive: blank.caseSensitive,
          })),
          explanation: data.explanation || null,
        },
      }
      onSave(updateData)
    }

    // Extract validation errors for display
    const validationErrors = useMemo((): BlankValidationError[] => {
      const formErrors: BlankValidationError[] = []

      // Only show errors if form is still invalid and has actual validation issues
      if (!isValid) {
        // Extract errors from form state
        if (errors.questionText?.message) {
          formErrors.push({
            code: BlankValidationErrorCode.INVALID_TAG_FORMAT,
            message: errors.questionText.message,
          })
        }

        if (errors.blanks?.message) {
          formErrors.push({
            code: BlankValidationErrorCode.MISSING_BLANK_CONFIG,
            message: errors.blanks.message,
          })
        }

        // Check for individual blank errors
        if (errors.blanks && Array.isArray(errors.blanks)) {
          errors.blanks.forEach((blankError, index) => {
            if (blankError?.message) {
              formErrors.push({
                code: BlankValidationErrorCode.MISSING_BLANK_CONFIG,
                message: `Blank ${index + 1}: ${blankError.message}`,
              })
            }
          })
        }
      }

      return formErrors
    }, [errors, watchedQuestionText, watchedBlanks, isValid])

    // Smart blank addition based on question text
    const addBlank = () => {
      if (watchedQuestionText) {
        const configuredPositions =
          watchedBlanks?.map((blank) => blank.position) || []
        const validation = validateBlankTextComprehensive(
          watchedQuestionText,
          configuredPositions,
        )

        // Find the first missing position using optimized validation
        const missingPosition = validation.missingConfigurations[0]

        if (missingPosition) {
          // Add blank for missing position from question text
          append({
            position: missingPosition,
            correctAnswer: "",
            answerVariations: "",
            caseSensitive: false,
          })
        } else {
          // No missing positions, add next sequential position
          const nextPosition = getNextBlankPosition(watchedQuestionText)
          append({
            position: nextPosition,
            correctAnswer: "",
            answerVariations: "",
            caseSensitive: false,
          })
        }
      } else {
        // Fallback to old behavior if no question text
        const newPosition = Math.max(...fields.map((_, i) => i + 1), 0) + 1
        append({
          position: newPosition,
          correctAnswer: "",
          answerVariations: "",
          caseSensitive: false,
        })
      }
    }

    // Determine if saving is allowed
    const canSave = isDirty && isValid && validationErrors.length === 0

    return (
      <FormGroup>
        {/* Show validation errors at the top */}
        {validationErrors.length > 0 && (
          <FillInBlankValidationErrors errors={validationErrors} />
        )}

        <Controller
          name="questionText"
          control={control}
          render={({ field }) => (
            <FormField
              label={t("questions.editor.questionText")}
              isRequired
              error={errors.questionText?.message}
              helperText={t("questions.editor.blankHelperText")}
            >
              <Textarea
                {...field}
                placeholder={t("quiz:placeholders.fillInBlankQuestion")}
                rows={3}
              />
            </FormField>
          )}
        />

        <Fieldset.Root>
          <Fieldset.Legend>{t("questions.editor.blanks")}</Fieldset.Legend>
          <VStack gap={4} align="stretch">
            {fields.map((field, index) => (
              <Box
                key={field.id}
                p={3}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
              >
                <FormGroup gap={3}>
                  <HStack>
                    <Text fontWeight="medium" fontSize="sm">
                      {t("questions.editor.blankNumber", { number: index + 1 })}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      onClick={() => remove(index)}
                    >
                      {t("questions.editor.remove")}
                    </Button>
                  </HStack>

                  <Controller
                    name={`blanks.${index}.correctAnswer`}
                    control={control}
                    render={({ field }) => (
                      <FormField
                        label={t("questions.editor.correctAnswer")}
                        isRequired
                        error={errors.blanks?.[index]?.correctAnswer?.message}
                      >
                        <Input
                          {...field}
                          placeholder={t("quiz:placeholders.fillInBlankAnswer")}
                        />
                      </FormField>
                    )}
                  />

                  <Controller
                    name={`blanks.${index}.answerVariations`}
                    control={control}
                    render={({ field }) => (
                      <FormField
                        label={t("questions.editor.answerVariations")}
                        error={
                          errors.blanks?.[index]?.answerVariations?.message
                        }
                        helperText={t(
                          "questions.editor.answerVariationsHelper",
                        )}
                      >
                        <Input
                          {...field}
                          placeholder={t(
                            "quiz:placeholders.fillInBlankVariations",
                          )}
                        />
                      </FormField>
                    )}
                  />

                  <Controller
                    name={`blanks.${index}.caseSensitive`}
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        error={errors.blanks?.[index]?.caseSensitive?.message}
                      >
                        <Checkbox
                          checked={value}
                          onCheckedChange={(e) => onChange(!!e.checked)}
                        >
                          {t("questions.editor.caseSensitiveCheckbox")}
                        </Checkbox>
                      </FormField>
                    )}
                  />
                </FormGroup>
              </Box>
            ))}

            <Box>
              <Button
                variant="outline"
                onClick={addBlank}
                disabled={!watchedQuestionText}
              >
                {t("questions.editor.addBlank")}
              </Button>
              {!watchedQuestionText && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {t("questions.editor.addBlankDisabledText")}
                </Text>
              )}
              {watchedQuestionText && (
                <Text fontSize="xs" color="gray.600" mt={1}>
                  {t("questions.editor.nextPosition", {
                    position: getNextBlankPosition(watchedQuestionText),
                  })}
                </Text>
              )}
            </Box>
          </VStack>
        </Fieldset.Root>

        <Controller
          name="explanation"
          control={control}
          render={({ field }) => (
            <FormField
              label={t("questions.editor.explanation")}
              error={errors.explanation?.message}
            >
              <Textarea
                {...field}
                placeholder={t("quiz:placeholders.fillInBlankExplanation")}
                rows={2}
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
            disabled={!canSave}
          >
            {t("questions.editor.saveChanges")}
          </Button>
          {!canSave && isDirty && (
            <Text fontSize="xs" color="gray.500">
              {validationErrors.length > 0
                ? t("questions.editor.fixValidationErrors")
                : !isValid
                  ? t("questions.editor.completeRequiredFields")
                  : t("questions.editor.noChangesToSave")}
            </Text>
          )}
        </HStack>
      </FormGroup>
    )
  } catch (error) {
    return (
      <ErrorEditor
        error={t("validation:editors.fillInBlankLoadError")}
        onCancel={onCancel}
      />
    )
  }
})
