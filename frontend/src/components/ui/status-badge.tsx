import { Badge, HStack, Spinner, Text } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation("common")

  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return { icon: "⏳", color: "gray", text: t("status.waiting") }
      case "processing":
        return {
          icon: <Spinner size="xs" />,
          color: "blue",
          text: t("status.processing"),
        }
      case "completed":
        return { icon: "✅", color: "green", text: t("status.completed") }
      case "failed":
        return { icon: "❌", color: "red", text: t("status.failed") }
      default:
        return { icon: "❓", color: "gray", text: t("status.unknown") }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant="outline" colorScheme={config.color}>
      <HStack gap={1} align="center">
        {typeof config.icon === "string" ? (
          <Text fontSize="xs">{config.icon}</Text>
        ) : (
          config.icon
        )}
        <Text>{config.text}</Text>
      </HStack>
    </Badge>
  )
}
