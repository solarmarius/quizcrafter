import {
  Badge,
  Box,
  Button,
  Card,
  Collapsible,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { LuArrowLeft, LuChevronDown, LuChevronRight } from "react-icons/lu"

import {
  type AnnotatedPage,
  CoverageService,
  type ModuleCoverageResponse,
  type SentenceCoverage as SentenceCoverageType,
} from "@/client"
import { ErrorState } from "@/components/Common"
import { coverageQueryConfig, queryKeys } from "@/lib/queryConfig"

import { CoverageStatisticsCard } from "./CoverageStatisticsCard"
import { SentenceHighlight } from "./SentenceHighlight"

interface ModuleCoverageViewProps {
  quizId: string
  moduleId: string
  onBack: () => void
}

/**
 * Main coverage visualization view for a selected module.
 * Shows statistics and annotated content with sentence-level coverage.
 */
export function ModuleCoverageView({
  quizId,
  moduleId,
  onBack,
}: ModuleCoverageViewProps) {
  const { t } = useTranslation("coverage")
  const [selectedSentence, setSelectedSentence] =
    useState<SentenceCoverageType | null>(null)

  const {
    data: coverage,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.moduleCoverage(quizId, moduleId),
    queryFn: () => CoverageService.getModuleCoverage({ quizId, moduleId }),
    ...coverageQueryConfig,
  })

  if (isLoading) {
    return (
      <VStack gap={6} align="stretch">
        <Button variant="ghost" onClick={onBack} alignSelf="flex-start">
          <LuArrowLeft />
          {t("actions.backToModules")}
        </Button>
        <Card.Root>
          <Card.Body>
            <VStack gap={4} py={8}>
              <Spinner size="lg" />
              <Text fontWeight="medium">{t("loading.computing")}</Text>
              <Text color="fg.muted" textAlign="center" maxW="md">
                {t("loading.computingDescription")}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    )
  }

  if (error) {
    return (
      <VStack gap={6} align="stretch">
        <Button variant="ghost" onClick={onBack} alignSelf="flex-start">
          <LuArrowLeft />
          {t("actions.backToModules")}
        </Button>
        <ErrorState
          title={t("errors.computeFailed")}
          message={t("errors.computeFailedMessage")}
          showRetry
        />
      </VStack>
    )
  }

  if (!coverage) {
    return null
  }

  return (
    <VStack gap={6} align="stretch">
      <Button variant="ghost" onClick={onBack} alignSelf="flex-start">
        <LuArrowLeft />
        {t("actions.backToModules")}
      </Button>

      <CoverageStatisticsCard
        statistics={coverage.statistics}
        moduleName={coverage.module.module_name}
      />

      <CoverageLegend />

      <VStack gap={4} align="stretch">
        <Text fontSize="lg" fontWeight="medium">
          {t("content.title")}
        </Text>

        {coverage.module.pages.map((page, index) => (
          <PageCoverageCard
            key={index}
            page={page}
            onSentenceClick={setSelectedSentence}
          />
        ))}
      </VStack>

      {selectedSentence && (
        <SentenceDetailPanel
          sentence={selectedSentence}
          coverage={coverage}
          onClose={() => setSelectedSentence(null)}
        />
      )}
    </VStack>
  )
}

function CoverageLegend() {
  const { t } = useTranslation("coverage")

  const levels = [
    { key: "high" as const, color: "green.200", label: t("levels.high") },
    { key: "medium" as const, color: "yellow.200", label: t("levels.medium") },
    { key: "low" as const, color: "orange.200", label: t("levels.low") },
    { key: "none" as const, color: "red.200", label: t("levels.none") },
  ]

  return (
    <HStack gap={4} flexWrap="wrap">
      <Text fontSize="sm" color="fg.muted">
        {t("legend.title")}:
      </Text>
      {levels.map((level) => (
        <HStack key={level.key} gap={1}>
          <Box w={4} h={4} bg={level.color} borderRadius="sm" />
          <Text fontSize="sm">{level.label}</Text>
        </HStack>
      ))}
    </HStack>
  )
}

interface PageCoverageCardProps {
  page: AnnotatedPage
  coverage: ModuleCoverageResponse
  selectedSentence: SentenceCoverageType | null
  onSentenceClick: (sentence: SentenceCoverageType) => void
}

function PageCoverageCard({
  page,
  onSentenceClick,
}: Omit<PageCoverageCardProps, "coverage" | "selectedSentence">) {
  const { t } = useTranslation("coverage")
  const [isOpen, setIsOpen] = useState(true)

  const coveragePercentage = calculatePageCoverage(page)

  return (
    <Card.Root>
      <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <Card.Header cursor="pointer" _hover={{ bg: "bg.subtle" }}>
            <HStack justify="space-between">
              <HStack gap={2}>
                {isOpen ? <LuChevronDown /> : <LuChevronRight />}
                <Text fontWeight="medium">{page.title}</Text>
              </HStack>
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">
                  {page.word_count} {t("content.words")}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  |
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {Math.round(coveragePercentage)}% {t("statistics.covered")}
                </Text>
              </HStack>
            </HStack>
          </Card.Header>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <Card.Body>
            <Box lineHeight="1.8">
              {page.sentences.map((sentence, index) => (
                <SentenceHighlight
                  key={index}
                  sentence={sentence}
                  onSentenceClick={onSentenceClick}
                />
              ))}
            </Box>
          </Card.Body>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card.Root>
  )
}

interface SentenceDetailPanelProps {
  sentence: SentenceCoverageType
  coverage: ModuleCoverageResponse
  onClose: () => void
}

function SentenceDetailPanel({
  sentence,
  coverage,
  onClose,
}: SentenceDetailPanelProps) {
  const { t } = useTranslation("coverage")

  const matchedQuestionIds = sentence.matched_questions ?? []
  const matchedQuestions = coverage.question_mappings
    .filter((q) => matchedQuestionIds.includes(q.question_id))
    .sort((a, b) => b.best_similarity_score - a.best_similarity_score)

  return (
    <Card.Root
      position="fixed"
      bottom={4}
      right={4}
      maxW="400px"
      maxH="70vh"
      shadow="lg"
      zIndex={10}
      display="flex"
      flexDirection="column"
    >
      <Card.Header flexShrink={0}>
        <HStack justify="space-between">
          <Text fontWeight="medium">{t("detail.title")}</Text>
          <Button size="sm" variant="ghost" onClick={onClose}>
            X
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body overflowY="auto">
        <VStack gap={3} align="stretch">
          <Box>
            <Text fontSize="sm" color="fg.muted">
              {t("detail.sentence")}:
            </Text>
            <Text fontSize="sm">{sentence.text}</Text>
          </Box>

          <HStack gap={4}>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                {t("detail.score")}
              </Text>
              <Text fontWeight="medium">
                {Math.round(sentence.coverage_score * 100)}%
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                {t("detail.level")}
              </Text>
              <Text fontWeight="medium">
                {getCoverageLevelLabel(sentence.coverage_level)}
              </Text>
            </Box>
          </HStack>

          {matchedQuestions.length > 0 && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={2}>
                {t("detail.matchedQuestions")} ({matchedQuestions.length}):
              </Text>
              <VStack gap={2} align="stretch">
                {matchedQuestions.map((q) => (
                  <Box
                    key={q.question_id}
                    p={2}
                    bg="bg.subtle"
                    borderRadius="md"
                  >
                    <Text fontSize="sm" lineClamp={4}>
                      {q.question_text}
                    </Text>
                    <HStack gap={2} mt={1}>
                      <Badge size="sm" colorPalette="blue">
                        {formatQuestionType(q.question_type)}
                      </Badge>
                      <Text fontSize="xs" color="fg.muted">
                        {t("detail.similarity")}:{" "}
                        {Math.round(q.best_similarity_score * 100)}%
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

function calculatePageCoverage(page: AnnotatedPage): number {
  const total = page.sentences.length
  if (total === 0) return 0

  const covered = page.sentences.filter(
    (s) => s.coverage_level !== "none",
  ).length

  return (covered / total) * 100
}

const COVERAGE_LEVEL_LABELS: Record<string, string> = {
  high: "High Coverage",
  medium: "Medium Coverage",
  low: "Low Coverage",
  none: "No Coverage",
}

function getCoverageLevelLabel(level: string): string {
  return COVERAGE_LEVEL_LABELS[level] || COVERAGE_LEVEL_LABELS.none
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  multiple_answer: "Multiple Answer",
  true_false: "True/False",
  matching: "Matching",
  fill_in_blank: "Fill in Blank",
  categorization: "Categorization",
}

function formatQuestionType(type: string): string {
  return QUESTION_TYPE_LABELS[type] || type
}
