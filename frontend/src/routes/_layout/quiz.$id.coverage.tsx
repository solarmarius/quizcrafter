import { Box, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import {
  CoverageModuleSelector,
  ModuleCoverageView,
} from "@/components/Coverage"

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
        <Text fontSize="xl" fontWeight="semibold">
          {t("title")}
        </Text>
        <Text color="fg.muted">{t("description")}</Text>
      </Box>

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
