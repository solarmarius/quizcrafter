import {
  Badge,
  Box,
  Card,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { LuBookOpen, LuFileQuestion } from "react-icons/lu"

import { CoverageService, type ModuleListItem } from "@/client"
import { ErrorState, LoadingSkeleton } from "@/components/Common"
import { queryKeys } from "@/lib/queryConfig"

interface CoverageModuleSelectorProps {
  quizId: string
  onSelectModule: (moduleId: string) => void
}

/**
 * Module selector for coverage analysis.
 * Displays available modules with question counts and content status.
 */
export function CoverageModuleSelector({
  quizId,
  onSelectModule,
}: CoverageModuleSelectorProps) {
  const { t } = useTranslation("coverage")

  const {
    data: moduleList,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.coverageModules(quizId),
    queryFn: () => CoverageService.listCoverageModules({ quizId }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <VStack gap={4} align="stretch">
        <Text fontSize="lg" fontWeight="medium">
          {t("selectModule.title")}
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {[1, 2, 3].map((i) => (
            <Card.Root key={i}>
              <Card.Body>
                <LoadingSkeleton height="80px" />
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      </VStack>
    )
  }

  if (error) {
    return (
      <ErrorState
        title={t("errors.loadModulesFailed")}
        message={t("errors.loadModulesMessage")}
      />
    )
  }

  const modules = moduleList?.modules || []

  if (modules.length === 0) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack gap={3} py={4}>
            <LuBookOpen size={32} />
            <Text fontWeight="medium">{t("selectModule.noModules")}</Text>
            <Text color="fg.muted" textAlign="center">
              {t("selectModule.noModulesDescription")}
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      <Box>
        <Text fontSize="lg" fontWeight="medium">
          {t("selectModule.title")}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {t("selectModule.description")}
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {modules.map((module) => (
          <ModuleCard
            key={module.module_id}
            module={module}
            onSelect={() => onSelectModule(module.module_id)}
          />
        ))}
      </SimpleGrid>
    </VStack>
  )
}

interface ModuleCardProps {
  module: ModuleListItem
  onSelect: () => void
}

function ModuleCard({ module, onSelect }: ModuleCardProps) {
  const { t } = useTranslation("coverage")
  const canAnalyze = module.has_content && module.question_count > 0

  return (
    <Card.Root
      cursor={canAnalyze ? "pointer" : "not-allowed"}
      opacity={canAnalyze ? 1 : 0.6}
      onClick={canAnalyze ? onSelect : undefined}
      _hover={
        canAnalyze ? { borderColor: "blue.500", shadow: "md" } : undefined
      }
      transition="all 0.2s"
    >
      <Card.Body>
        <VStack align="stretch" gap={3}>
          <Text fontWeight="medium" lineClamp={2}>
            {module.module_name}
          </Text>

          <HStack gap={2} flexWrap="wrap">
            <Badge colorPalette={module.question_count > 0 ? "green" : "gray"}>
              <HStack gap={1}>
                <LuFileQuestion size={12} />
                <Text>
                  {t("selectModule.questionCount", {
                    count: module.question_count,
                  })}
                </Text>
              </HStack>
            </Badge>

            {!module.has_content && (
              <Badge colorPalette="orange">{t("selectModule.noContent")}</Badge>
            )}
          </HStack>

          {!canAnalyze && (
            <Text fontSize="xs" color="fg.muted">
              {!module.has_content
                ? t("selectModule.needsContent")
                : t("selectModule.needsQuestions")}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
