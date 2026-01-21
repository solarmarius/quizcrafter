import { Box, Stack, Text } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

export const FeatureStep = () => {
  const { t } = useTranslation("common")

  return (
    <Stack align="center" minH="300px" justify="center">
      <Box textAlign="left">
        <Text
          fontSize="2xl"
          fontWeight="bold"
          color="ui.main"
          mb={4}
          textAlign="center"
        >
          {t("onboarding.features.title")}
        </Text>
        <Text fontSize="lg" color="gray.600" lineHeight="tall">
          {t("onboarding.features.intro")}
        </Text>
        <Text fontSize="lg" color="gray.600" lineHeight="tall">
          - {t("onboarding.features.tip1")}
        </Text>
        <Text fontSize="lg" color="gray.600" lineHeight="tall">
          - {t("onboarding.features.tip2")}
        </Text>
        <Text fontSize="lg" color="gray.600" lineHeight="tall">
          - {t("onboarding.features.tip3")}
        </Text>
      </Box>
    </Stack>
  )
}
