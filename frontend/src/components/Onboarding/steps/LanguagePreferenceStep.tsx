import LanguagePreference from "@/components/UserSettings/LanguagePreference"
import { Stack, Text } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

export const LanguagePreferenceStep = () => {
  const { t } = useTranslation("common")

  return (
    <Stack gap={6} align="center" minH="300px" justify="center">
      <Text fontSize="2xl" fontWeight="bold" color="ui.main" textAlign="center">
        {t("onboarding.language.title")}
      </Text>
      <LanguagePreference />
    </Stack>
  )
}
