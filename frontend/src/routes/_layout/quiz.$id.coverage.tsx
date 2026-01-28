import { Alert, Box, HStack, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import {
  CoverageModuleSelector,
  ModuleCoverageView,
} from "@/components/Coverage"
import { ToggleTip } from "@/components/ui/toggle-tip"

interface CoverageSearch {
  module?: string
}

export const Route = createFileRoute("/_layout/quiz/$id/coverage")({
  validateSearch: (search: Record<string, unknown>): CoverageSearch => {
    return {
      module: typeof search.module === "string" ? search.module : undefined,
    }
  },
  component: CoveragePage,
})

function CoveragePage() {
  const { t } = useTranslation("coverage")
  const { id } = Route.useParams()
  const search = Route.useSearch()
  const selectedModuleId = search.module
  const navigate = Route.useNavigate()

  const handleSelectModule = useCallback(
    (moduleId: string) => {
      navigate({ search: { module: moduleId } })
    },
    [navigate],
  )

  const handleBack = useCallback(() => {
    navigate({ search: {} })
  }, [navigate])

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <HStack gap={1}>
          <Text fontSize="xl" fontWeight="semibold">
            {t("title")}
          </Text>
          <ToggleTip aria-label={t("explanation.title")}>
            <VStack align="start" gap={2}>
              <Text fontWeight="medium">{t("explanation.title")}</Text>
              <Text fontSize="sm">{t("explanation.intro")}</Text>
              <Text fontSize="sm">{t("explanation.process")}</Text>
              <VStack align="start" gap={1} pl={2}>
                <Text fontSize="sm">• {t("explanation.thresholds.high")}</Text>
                <Text fontSize="sm">
                  • {t("explanation.thresholds.medium")}
                </Text>
                <Text fontSize="sm">• {t("explanation.thresholds.low")}</Text>
                <Text fontSize="sm">• {t("explanation.thresholds.none")}</Text>
              </VStack>
              <Text fontSize="xs" color="fg.muted">
                {t("explanation.note")}
              </Text>
            </VStack>
          </ToggleTip>
        </HStack>
        <Text color="fg.muted">{t("description")}</Text>
      </Box>

      <Alert.Root status="warning" variant="subtle">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t("experimental.title")}</Alert.Title>
          <Alert.Description>{t("experimental.message")}</Alert.Description>
        </Alert.Content>
      </Alert.Root>

      {selectedModuleId ? (
        <ModuleCoverageView
          quizId={id}
          moduleId={selectedModuleId}
          onBack={handleBack}
        />
      ) : (
        <CoverageModuleSelector
          quizId={id}
          onSelectModule={handleSelectModule}
        />
      )}
    </VStack>
  )
}
