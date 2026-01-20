import { Heading, Text, VStack } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

import DeleteConfirmation from "./DeleteConfirmation"

const DeleteAccount = () => {
  const { t } = useTranslation("common")

  return (
    <VStack align="stretch" gap={4} w="75%">
      <Heading size="xl">{t("deleteAccount.title")}</Heading>
      <Text>{t("deleteAccount.description")}</Text>
      <Text>{t("deleteAccount.warningOngoing")}</Text>
      <DeleteConfirmation />
    </VStack>
  )
}
export default DeleteAccount
