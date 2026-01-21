import type { QuizLanguage, QuizTone } from "@/client"
import { FormField, FormGroup } from "@/components/forms"
import { QUIZ_LANGUAGES, QUIZ_TONES } from "@/lib/constants"
import { Box, Card, HStack, RadioGroup, Text, VStack } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

interface QuizSettings {
  language: QuizLanguage
  tone: QuizTone
}

interface QuizSettingsStepProps {
  settings?: QuizSettings
  onSettingsChange: (settings: QuizSettings) => void
}

const DEFAULT_SETTINGS: QuizSettings = {
  language: QUIZ_LANGUAGES.ENGLISH,
  tone: QUIZ_TONES.ACADEMIC,
}

export function QuizSettingsStep({
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
}: QuizSettingsStepProps) {
  const { t } = useTranslation("quiz")

  const updateSettings = (updates: Partial<QuizSettings>) => {
    const newSettings = { ...settings, ...updates }
    onSettingsChange(newSettings)
  }

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
                    settings.language === option.value ? "blue.500" : "gray.200"
                  }
                  bg={settings.language === option.value ? "blue.50" : "white"}
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
                    settings.tone === option.value ? "green.500" : "gray.200"
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
  )
}
