import type { QuizLanguage, QuizTone } from "@/client"
import { FormField, FormGroup } from "@/components/forms"
import { QUIZ_LANGUAGES, QUIZ_TONES } from "@/lib/constants"
import {
  Alert,
  Box,
  Card,
  HStack,
  RadioGroup,
  Tabs,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 500

interface QuizSettings {
  language: QuizLanguage
  tone: QuizTone
  customInstructions?: string
}

interface QuizSettingsStepProps {
  settings?: QuizSettings
  onSettingsChange: (settings: QuizSettings) => void
}

const DEFAULT_SETTINGS: QuizSettings = {
  language: QUIZ_LANGUAGES.ENGLISH,
  tone: QUIZ_TONES.ACADEMIC,
  customInstructions: "",
}

export function QuizSettingsStep({
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
}: QuizSettingsStepProps) {
  const { t } = useTranslation("quiz")
  const [currentTab, setCurrentTab] = useState("basic")

  const updateSettings = (updates: Partial<QuizSettings>) => {
    const newSettings = { ...settings, ...updates }
    onSettingsChange(newSettings)
  }

  const customInstructionsLength = settings.customInstructions?.length || 0

  const languageOptions = [
    {
      value: QUIZ_LANGUAGES.ENGLISH,
      label: t("settings.language.en"),
      description: t("settings.language.enDescription"),
    },
    {
      value: QUIZ_LANGUAGES.NORWEGIAN,
      label: t("settings.language.no"),
      description: t("settings.language.noDescription"),
    },
  ]

  const toneOptions = [
    {
      value: QUIZ_TONES.ACADEMIC,
      label: t("settings.tone.academic"),
      description: t("settings.tone.academicDescription"),
    },
    {
      value: QUIZ_TONES.CASUAL,
      label: t("settings.tone.casual"),
      description: t("settings.tone.casualDescription"),
    },
    {
      value: QUIZ_TONES.ENCOURAGING,
      label: t("settings.tone.encouraging"),
      description: t("settings.tone.encouragingDescription"),
    },
    {
      value: QUIZ_TONES.PROFESSIONAL,
      label: t("settings.tone.professional"),
      description: t("settings.tone.professionalDescription"),
    },
  ]

  return (
    <Tabs.Root
      value={currentTab}
      onValueChange={(details) => setCurrentTab(details.value)}
    >
      <Tabs.List mb={4}>
        <Tabs.Trigger value="basic">{t("settings.tabs.basic")}</Tabs.Trigger>
        <Tabs.Trigger value="advanced">
          {t("settings.tabs.advanced")}
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="basic">
        <FormGroup gap={6}>
          <FormField label={t("settings.language.label")} isRequired>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={3}>
                {t("settings.language.description")}
              </Text>
              <RadioGroup.Root
                value={settings.language}
                onValueChange={(details) =>
                  updateSettings({ language: details.value as QuizLanguage })
                }
              >
                <VStack gap={3} align="stretch">
                  {languageOptions.map((option) => (
                    <Card.Root
                      key={option.value}
                      variant="outline"
                      cursor="pointer"
                      _hover={{ borderColor: "blue.300" }}
                      borderColor={
                        settings.language === option.value
                          ? "blue.500"
                          : "gray.200"
                      }
                      bg={
                        settings.language === option.value ? "blue.50" : "white"
                      }
                      onClick={() => updateSettings({ language: option.value })}
                      data-testid={`language-card-${option.value}`}
                    >
                      <Card.Body>
                        <HStack>
                          <RadioGroup.Item value={option.value} />
                          <Box flex={1}>
                            <Text fontWeight="semibold">{option.label}</Text>
                            <Text fontSize="sm" color="gray.600">
                              {option.description}
                            </Text>
                          </Box>
                        </HStack>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </VStack>
              </RadioGroup.Root>
            </Box>
          </FormField>

          <FormField label={t("settings.tone.label")} isRequired>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={3}>
                {t("settings.tone.description")}
              </Text>
              <RadioGroup.Root
                value={settings.tone}
                onValueChange={(details) =>
                  updateSettings({ tone: details.value as QuizTone })
                }
              >
                <VStack gap={3} align="stretch">
                  {toneOptions.map((option) => (
                    <Card.Root
                      key={option.value}
                      variant="outline"
                      cursor="pointer"
                      _hover={{ borderColor: "green.300" }}
                      borderColor={
                        settings.tone === option.value
                          ? "green.500"
                          : "gray.200"
                      }
                      bg={settings.tone === option.value ? "green.50" : "white"}
                      onClick={() => updateSettings({ tone: option.value })}
                      data-testid={`tone-card-${option.value}`}
                    >
                      <Card.Body>
                        <HStack>
                          <RadioGroup.Item value={option.value} />
                          <Box flex={1}>
                            <Text fontWeight="semibold">{option.label}</Text>
                            <Text fontSize="sm" color="gray.600">
                              {option.description}
                            </Text>
                          </Box>
                        </HStack>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </VStack>
              </RadioGroup.Root>
            </Box>
          </FormField>
        </FormGroup>
      </Tabs.Content>

      <Tabs.Content value="advanced">
        <VStack gap={6} align="stretch">
          <FormField label={t("settings.customInstructions.label")}>
            <VStack gap={3} align="stretch">
              <Text fontSize="sm" color="gray.600">
                {t("settings.customInstructions.description")}
              </Text>

              <Alert.Root status="warning" variant="subtle">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {t("settings.customInstructions.warningTitle")}
                  </Alert.Title>
                  <Alert.Description>
                    {t("settings.customInstructions.warningMessage")}
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>

              <Textarea
                value={settings.customInstructions || ""}
                onChange={(e) =>
                  updateSettings({
                    customInstructions: e.target.value.slice(
                      0,
                      MAX_CUSTOM_INSTRUCTIONS_LENGTH,
                    ),
                  })
                }
                placeholder={t("settings.customInstructions.placeholder")}
                rows={4}
                resize="vertical"
              />

              <Text
                fontSize="sm"
                color={
                  customInstructionsLength >= MAX_CUSTOM_INSTRUCTIONS_LENGTH
                    ? "red.500"
                    : "gray.500"
                }
                textAlign="right"
              >
                {t("settings.customInstructions.charCount", {
                  current: customInstructionsLength,
                  max: MAX_CUSTOM_INSTRUCTIONS_LENGTH,
                })}
              </Text>

              <Card.Root variant="outline" bg="gray.50">
                <Card.Body>
                  <Text fontWeight="semibold" mb={2}>
                    {t("settings.customInstructions.examplesTitle")}
                  </Text>
                  <VStack align="stretch" gap={1}>
                    <Text fontSize="sm" color="gray.600">
                      • {t("settings.customInstructions.example1")}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      • {t("settings.customInstructions.example2")}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      • {t("settings.customInstructions.example3")}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </VStack>
          </FormField>
        </VStack>
      </Tabs.Content>
    </Tabs.Root>
  )
}
