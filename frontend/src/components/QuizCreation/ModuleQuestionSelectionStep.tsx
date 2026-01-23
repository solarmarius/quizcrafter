import { Field } from "@/components/ui/field"
import {
  Alert,
  Box,
  Button,
  Card,
  HStack,
  Heading,
  Input,
  Select,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react"
import type React from "react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IoAdd, IoClose } from "react-icons/io5"

import type { QuestionBatch, QuestionDifficulty, QuestionType } from "@/client"
import {
  QUESTION_BATCH_DEFAULTS,
  QUESTION_DIFFICULTIES,
  VALIDATION_MESSAGES,
  VALIDATION_RULES,
} from "@/lib/constants"
import {
  calculateModuleQuestions,
  calculateTotalQuestionsFromBatches,
  validateModuleBatches,
} from "@/lib/utils"

interface ModuleQuestionSelectionStepProps {
  selectedModules: Record<string, string>
  moduleQuestions: Record<string, QuestionBatch[]>
  onModuleQuestionChange: (moduleId: string, batches: QuestionBatch[]) => void
}

export const ModuleQuestionSelectionStep: React.FC<
  ModuleQuestionSelectionStepProps
> = ({ selectedModules, moduleQuestions, onModuleQuestionChange }) => {
  const { t } = useTranslation(["creation", "quiz", "validation"])

  // Create translated collections inside component
  const questionTypeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          {
            value: "multiple_choice" as QuestionType,
            label: t("quiz:questionTypes.multiple_choice"),
          },
          {
            value: "multiple_answer" as QuestionType,
            label: t("quiz:questionTypes.multiple_answer"),
          },
          {
            value: "fill_in_blank" as QuestionType,
            label: t("quiz:questionTypes.fill_in_blank"),
          },
          {
            value: "matching" as QuestionType,
            label: t("quiz:questionTypes.matching"),
          },
          {
            value: "categorization" as QuestionType,
            label: t("quiz:questionTypes.categorization"),
          },
          {
            value: "true_false" as QuestionType,
            label: t("quiz:questionTypes.true_false"),
          },
        ],
      }),
    [t],
  )

  const difficultyCollection = useMemo(
    () =>
      createListCollection({
        items: [
          {
            value: QUESTION_DIFFICULTIES.EASY,
            label: t("quiz:difficulty.easy"),
          },
          {
            value: QUESTION_DIFFICULTIES.MEDIUM,
            label: t("quiz:difficulty.medium"),
          },
          {
            value: QUESTION_DIFFICULTIES.HARD,
            label: t("quiz:difficulty.hard"),
          },
        ],
      }),
    [t],
  )
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({})

  const totalQuestions = useMemo(() => {
    return calculateTotalQuestionsFromBatches(moduleQuestions)
  }, [moduleQuestions])

  const moduleIds = Object.keys(selectedModules)

  const addBatch = (moduleId: string) => {
    const currentBatches = moduleQuestions[moduleId] || []

    if (currentBatches.length >= VALIDATION_RULES.MAX_BATCHES_PER_MODULE) {
      setValidationErrors((prev) => ({
        ...prev,
        [moduleId]: [VALIDATION_MESSAGES.MAX_BATCHES],
      }))
      return
    }

    const newBatch: QuestionBatch = {
      question_type: QUESTION_BATCH_DEFAULTS.DEFAULT_QUESTION_TYPE,
      count: QUESTION_BATCH_DEFAULTS.DEFAULT_QUESTION_COUNT,
      difficulty: QUESTION_BATCH_DEFAULTS.DEFAULT_DIFFICULTY,
    }

    const updatedBatches = [...currentBatches, newBatch]
    onModuleQuestionChange(moduleId, updatedBatches)

    // Clear validation errors
    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[moduleId]
      return newErrors
    })
  }

  const removeBatch = (moduleId: string, batchIndex: number) => {
    const currentBatches = moduleQuestions[moduleId] || []
    const updatedBatches = currentBatches.filter(
      (_, index) => index !== batchIndex,
    )
    onModuleQuestionChange(moduleId, updatedBatches)

    // Clear validation errors if removing resolved the issue
    if (updatedBatches.length <= VALIDATION_RULES.MAX_BATCHES_PER_MODULE) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[moduleId]
        return newErrors
      })
    }
  }

  const updateBatch = (
    moduleId: string,
    batchIndex: number,
    updates: Partial<QuestionBatch>,
  ) => {
    const currentBatches = moduleQuestions[moduleId] || []
    const updatedBatches = currentBatches.map((batch, index) =>
      index === batchIndex ? { ...batch, ...updates } : batch,
    )

    // Validate the updated batches
    const errors = validateModuleBatches(updatedBatches)

    if (errors.length > 0) {
      setValidationErrors((prev) => ({
        ...prev,
        [moduleId]: errors,
      }))
    } else {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[moduleId]
        return newErrors
      })
    }

    onModuleQuestionChange(moduleId, updatedBatches)
  }

  const handleQuestionCountChange = (
    moduleId: string,
    batchIndex: number,
    value: string,
  ) => {
    const numValue = Number.parseInt(value, 10)
    if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 20) {
      updateBatch(moduleId, batchIndex, { count: numValue })
    }
  }

  return (
    <Box>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="md" mb={2}>
            {t("questionConfig.title")}
          </Heading>
          <Text color="gray.600">{t("questionConfig.description")}</Text>
        </Box>

        {/* Summary Card */}
        <Card.Root
          variant="elevated"
          bg="blue.50"
          borderColor="blue.200"
          borderWidth={1}
        >
          <Card.Body>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600" mb={1}>
                {t("questionConfig.totalQuestions")}
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="blue.600">
                {totalQuestions}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {t("questionConfig.acrossModules", { count: moduleIds.length })}
              </Text>
            </Box>
          </Card.Body>
        </Card.Root>

        {/* Large question count warning */}
        {totalQuestions > 500 && (
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Title>{t("questionConfig.largeCountWarning")}</Alert.Title>
            <Alert.Description>
              {t("questionConfig.largeCountMessage")}
            </Alert.Description>
          </Alert.Root>
        )}

        {/* Module Configuration */}
        <VStack gap={4} align="stretch">
          {moduleIds.map((moduleId) => {
            const moduleBatches = moduleQuestions[moduleId] || []
            const moduleErrors = validationErrors[moduleId] || []
            const moduleTotal = calculateModuleQuestions(moduleBatches)

            return (
              <Card.Root
                key={moduleId}
                variant="outline"
                borderColor={moduleErrors.length > 0 ? "red.200" : "gray.200"}
                bg={moduleErrors.length > 0 ? "red.50" : "white"}
              >
                <Card.Body>
                  <VStack align="stretch" gap={4}>
                    {/* Module Header */}
                    <HStack justify="space-between" align="center">
                      <Box>
                        <Text fontWeight="medium" fontSize="lg">
                          {selectedModules[moduleId]}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {t("questionConfig.questionsTotal", {
                            count: moduleTotal,
                          })}{" "}
                          •{" "}
                          {t("questionConfig.batchCount", {
                            count: moduleBatches.length,
                          })}
                        </Text>
                      </Box>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBatch(moduleId)}
                        disabled={
                          moduleBatches.length >=
                          VALIDATION_RULES.MAX_BATCHES_PER_MODULE
                        }
                      >
                        <IoAdd />
                        {t("questionConfig.addBatch")}
                      </Button>
                    </HStack>

                    {/* Validation Errors */}
                    {moduleErrors.length > 0 && (
                      <Alert.Root status="error" size="sm">
                        <Alert.Indicator />
                        <Alert.Description>
                          {moduleErrors.map((errorKey, index) => {
                            // Handle keys with interpolation params (e.g., "validation:questionBatch.invalidCountWithIndex:1")
                            const lastColonIndex = errorKey.lastIndexOf(":")
                            const hasParam =
                              lastColonIndex > errorKey.indexOf(":") // Has more than namespace colon
                            if (hasParam) {
                              const key = errorKey.substring(0, lastColonIndex)
                              const param = errorKey.substring(
                                lastColonIndex + 1,
                              )
                              return (
                                <Text key={index} fontSize="sm">
                                  {t(key as any, { index: param })}
                                </Text>
                              )
                            }
                            return (
                              <Text key={index} fontSize="sm">
                                {t(errorKey as any)}
                              </Text>
                            )
                          })}
                        </Alert.Description>
                      </Alert.Root>
                    )}

                    {/* Question Batches */}
                    {moduleBatches.length > 0 ? (
                      <VStack gap={3} align="stretch">
                        {moduleBatches.map((batch, batchIndex) => (
                          <Box
                            key={batchIndex}
                            p={3}
                            bg="gray.50"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="gray.200"
                          >
                            <HStack gap={3} align="end">
                              <Box flex={1}>
                                <Field label={t("questionConfig.questionType")}>
                                  <Select.Root
                                    collection={questionTypeCollection}
                                    value={[batch.question_type]}
                                    onValueChange={(details) =>
                                      updateBatch(moduleId, batchIndex, {
                                        question_type: details
                                          .value[0] as QuestionType,
                                      })
                                    }
                                    size="sm"
                                  >
                                    <Select.Control>
                                      <Select.Trigger>
                                        <Select.ValueText
                                          placeholder={t(
                                            "questionConfig.selectQuestionType",
                                          )}
                                        />
                                      </Select.Trigger>
                                      <Select.IndicatorGroup>
                                        <Select.Indicator />
                                      </Select.IndicatorGroup>
                                    </Select.Control>
                                    <Select.Positioner>
                                      <Select.Content>
                                        {questionTypeCollection.items.map(
                                          (option) => (
                                            <Select.Item
                                              item={option}
                                              key={option.value}
                                            >
                                              {option.label}
                                              <Select.ItemIndicator />
                                            </Select.Item>
                                          ),
                                        )}
                                      </Select.Content>
                                    </Select.Positioner>
                                  </Select.Root>
                                </Field>
                              </Box>

                              <Box width="100px">
                                <Field label={t("questionConfig.questions")}>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={batch.count}
                                    onChange={(e) =>
                                      handleQuestionCountChange(
                                        moduleId,
                                        batchIndex,
                                        e.target.value,
                                      )
                                    }
                                    textAlign="center"
                                    size="sm"
                                  />
                                </Field>
                              </Box>

                              <Box width="120px">
                                <Field label={t("questionConfig.difficulty")}>
                                  <Select.Root
                                    collection={difficultyCollection}
                                    value={[
                                      batch.difficulty ||
                                        QUESTION_DIFFICULTIES.MEDIUM,
                                    ]}
                                    onValueChange={(details) =>
                                      updateBatch(moduleId, batchIndex, {
                                        difficulty: details
                                          .value[0] as QuestionDifficulty,
                                      })
                                    }
                                    size="sm"
                                  >
                                    <Select.Control>
                                      <Select.Trigger>
                                        <Select.ValueText
                                          placeholder={t(
                                            "questionConfig.selectDifficulty",
                                          )}
                                        />
                                      </Select.Trigger>
                                      <Select.IndicatorGroup>
                                        <Select.Indicator />
                                      </Select.IndicatorGroup>
                                    </Select.Control>
                                    <Select.Positioner>
                                      <Select.Content>
                                        {difficultyCollection.items.map(
                                          (option) => (
                                            <Select.Item
                                              item={option}
                                              key={option.value}
                                            >
                                              {option.label}
                                              <Select.ItemIndicator />
                                            </Select.Item>
                                          ),
                                        )}
                                      </Select.Content>
                                    </Select.Positioner>
                                  </Select.Root>
                                </Field>
                              </Box>

                              <Button
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() =>
                                  removeBatch(moduleId, batchIndex)
                                }
                              >
                                <IoClose />
                              </Button>
                            </HStack>
                          </Box>
                        ))}
                      </VStack>
                    ) : (
                      <Box textAlign="center" py={6} color="gray.500">
                        <Text>{t("questionConfig.noBatches")}</Text>
                        <Text fontSize="sm">
                          {t("questionConfig.noBatchesHint")}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Card.Body>
              </Card.Root>
            )
          })}
        </VStack>

        {moduleIds.length === 0 && (
          <Card.Root variant="outline">
            <Card.Body textAlign="center" py={8}>
              <Text color="gray.500">
                {t("questionConfig.noModulesSelected")}
              </Text>
            </Card.Body>
          </Card.Root>
        )}

        <Box mt={4}>
          <Text fontSize="sm" color="gray.600">
            {t("questionConfig.tip")}
          </Text>
        </Box>
      </VStack>
    </Box>
  )
}
