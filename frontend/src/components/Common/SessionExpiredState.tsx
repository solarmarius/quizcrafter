import { Container, Heading, Text, VStack } from "@chakra-ui/react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { clearAuthToken } from "@/lib/api/client"

export function SessionExpiredState() {
  const { t } = useTranslation("common")
  const navigate = useNavigate()

  const handleLoginClick = () => {
    clearAuthToken()
    navigate({ to: "/login", search: { error: undefined } })
  }

  return (
    <Container maxW="md" py={16}>
      <VStack gap={6} textAlign="center">
        <Heading size="lg">{t("errors.sessionExpired")}</Heading>
        <Text color="fg.muted">{t("errors.sessionExpiredDescription")}</Text>
        <Button onClick={handleLoginClick}>{t("errors.loginAgain")}</Button>
      </VStack>
    </Container>
  )
}
