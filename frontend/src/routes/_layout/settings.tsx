import { Box, Container, Tabs, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import { useAuth } from "@/hooks/auth"

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  const { user: currentUser } = useAuth()
  const [currentTab, setCurrentTab] = useState("my-profile")
  const { t } = useTranslation("common")

  if (!currentUser) {
    return null
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="3xl" fontWeight="bold">
            {t("userSettings.title")}
          </Text>
          <Text color="gray.600">{t("userSettings.description")}</Text>
        </Box>

        {/* Settings Tabs */}
        <Tabs.Root
          value={currentTab}
          onValueChange={(details) => setCurrentTab(details.value)}
          size="lg"
        >
          <Tabs.List>
            <Tabs.Trigger value="my-profile">
              {t("userSettings.tabs.myProfile")}
            </Tabs.Trigger>
            <Tabs.Trigger value="danger-zone">
              {t("userSettings.tabs.dangerZone")}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="my-profile">
            <Box mt={6}>
              <UserInformation />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="danger-zone">
            <Box mt={6}>
              <DeleteAccount />
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </VStack>
    </Container>
  )
}
