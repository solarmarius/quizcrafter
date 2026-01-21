import { Box, Button, Text, VStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  showRetry?: boolean
  variant?: "full" | "inline"
  borderless?: boolean
}

export const ErrorState = memo(function ErrorState({
  title,
  message,
  onRetry,
  showRetry = true,
  variant = "full",
  borderless = false,
}: ErrorStateProps) {
  const { t } = useTranslation("common")
  const displayTitle = title ?? t("errors.somethingWentWrong")

  if (variant === "inline") {
    return (
      <Box
        p={4}
        bg="red.50"
        borderRadius="md"
        borderLeft={borderless ? "none" : "4px solid"}
        borderColor="red.200"
      >
        <Text fontSize="md" fontWeight="medium" color="red.700" mb={1}>
          {displayTitle}
        </Text>
        <Text fontSize="sm" color="red.600">
          {message}
        </Text>
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            colorScheme="red"
            variant="outline"
            size="sm"
            mt={3}
          >
            {t("actions.tryAgain")}
          </Button>
        )}
      </Box>
    )
  }

  return (
    <Box textAlign="center" py={12}>
      <VStack gap={4}>
        <Text fontSize="xl" fontWeight="bold" color="red.500">
          {displayTitle}
        </Text>
        <Text color="gray.600">{message}</Text>
        {showRetry && onRetry && (
          <Button onClick={onRetry} colorScheme="red" variant="outline" mt={4}>
            {t("actions.tryAgain")}
          </Button>
        )}
      </VStack>
    </Box>
  )
})
