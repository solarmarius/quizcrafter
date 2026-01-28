import { Box, Stack, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { useLocalizedRoute } from "@/hooks/common"
import { LOCALIZED_ROUTES } from "@/lib/routes"

export const PrivacyPolicyStep = () => {
  const { t } = useTranslation("common")
  const { getLocalizedRoute } = useLocalizedRoute()

  return (
    <Stack gap={6} align="center" py={8} minH="300px" justify="center">
      <Box textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" color="ui.main" mb={4}>
          {t("onboarding.privacy.title")}
        </Text>
        <Text fontSize="lg" color="gray.600" lineHeight="tall" mb={4}>
          {t("onboarding.privacy.description")}
        </Text>
        <Link to={getLocalizedRoute(LOCALIZED_ROUTES.privacyPolicy) as any}>
          <Text
            color="teal.500"
            textDecoration="underline"
            fontSize="lg"
            _hover={{ color: "teal.600" }}
            cursor="pointer"
          >
            {t("onboarding.privacy.viewPolicy")}
          </Text>
        </Link>
        <Text mt={2} fontSize="sm" color="gray.600">
          {t("onboarding.privacy.agreement")}
        </Text>
      </Box>
    </Stack>
  )
}
