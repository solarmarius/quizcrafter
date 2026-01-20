import { Box, Card, HStack, RadioGroup, Text, VStack } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

import {
  STORAGE_KEY_UI_LANGUAGE,
  type UILanguage,
  UI_LANGUAGES,
  UI_LANGUAGE_LABELS,
} from "@/i18n"

/**
 * LanguagePreference component for switching UI language.
 * Persists selection to localStorage and immediately updates the UI.
 *
 * @example
 * ```tsx
 * <LanguagePreference />
 * ```
 */
const LanguagePreference = () => {
  const { i18n, t } = useTranslation("common")

  const handleLanguageChange = (value: string) => {
    const newLanguage = value as UILanguage
    i18n.changeLanguage(newLanguage)
    localStorage.setItem(STORAGE_KEY_UI_LANGUAGE, newLanguage)
  }

  const languageOptions = [
    {
      value: UI_LANGUAGES.ENGLISH,
      label: UI_LANGUAGE_LABELS.en,
      description: t("userSettings.language.englishDescription"),
    },
    {
      value: UI_LANGUAGES.NORWEGIAN,
      label: UI_LANGUAGE_LABELS.no,
      description: t("userSettings.language.norwegianDescription"),
    },
  ]

  return (
    <Box w={{ sm: "full", md: "md" }}>
      <Text fontSize="md" fontWeight="semibold" mb={2}>
        {t("userSettings.language.title")}
      </Text>
      <Text fontSize="sm" color="gray.600" mb={4}>
        {t("userSettings.language.description")}
      </Text>

      <RadioGroup.Root
        value={i18n.language.split("-")[0]}
        onValueChange={(details) => handleLanguageChange(details.value)}
      >
        <VStack gap={3} align="stretch">
          {languageOptions.map((option) => (
            <Card.Root
              key={option.value}
              variant="outline"
              cursor="pointer"
              _hover={{ borderColor: "blue.300" }}
              borderColor={
                i18n.language.split("-")[0] === option.value
                  ? "blue.500"
                  : "gray.200"
              }
              bg={
                i18n.language.split("-")[0] === option.value
                  ? "blue.50"
                  : "white"
              }
              onClick={() => handleLanguageChange(option.value)}
              data-testid={`language-option-${option.value}`}
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
  )
}

export default LanguagePreference
