import { Box, Text } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

interface UnsupportedDisplayProps {
  questionType: string
}

export function UnsupportedDisplay({ questionType }: UnsupportedDisplayProps) {
  const { t } = useTranslation("quiz")

  return (
    <Box
      p={4}
      bg="orange.50"
      borderRadius="md"
      borderLeft="4px solid"
      borderColor="orange.200"
    >
      <Text fontSize="md" fontWeight="medium" color="orange.700" mb={1}>
        {t("questions.unsupportedType")}
      </Text>
      <Text fontSize="sm" color="orange.600">
        {t("questions.unsupportedTypeMessage", { questionType })}
      </Text>
    </Box>
  )
}
