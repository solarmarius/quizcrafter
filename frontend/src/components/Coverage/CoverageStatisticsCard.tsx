import { Badge, Card, HStack, Progress, Text, VStack } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

import type { CoverageStatistics } from "@/client"

interface CoverageStatisticsCardProps {
  statistics: CoverageStatistics
  moduleName: string
}

/**
 * Displays coverage statistics for a module.
 * Shows overall coverage percentage and key metrics.
 */
export function CoverageStatisticsCard({
  statistics,
  moduleName,
}: CoverageStatisticsCardProps) {
  const { t } = useTranslation("coverage")

  const coverageLevel = getCoverageLevel(statistics.coverage_percentage)
  const colorPalette = getCoverageColor(coverageLevel)

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between" align="center">
          <Text fontWeight="medium">{moduleName}</Text>
          <Badge colorPalette={colorPalette} size="lg">
            {Math.round(statistics.coverage_percentage)}%{" "}
            {t("statistics.covered")}
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          <Progress.Root
            value={statistics.coverage_percentage}
            size="lg"
            colorPalette={colorPalette}
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <StatItem
              label={t("statistics.sentences")}
              value={`${statistics.covered_sentences}/${statistics.total_sentences}`}
            />
            <StatItem
              label={t("statistics.questions")}
              value={statistics.total_questions.toString()}
            />
            <StatItem
              label={t("statistics.largestGap")}
              value={t("statistics.gapSentences", {
                count: statistics.largest_gap_sentences,
              })}
            />
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

interface StatItemProps {
  label: string
  value: string
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <VStack gap={0} align="center">
      <Text fontSize="lg" fontWeight="semibold">
        {value}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
    </VStack>
  )
}

function getCoverageLevel(percentage: number): string {
  if (percentage >= 70) return "high"
  if (percentage >= 50) return "medium"
  if (percentage >= 30) return "low"
  return "none"
}

function getCoverageColor(
  level: string,
): "green" | "yellow" | "orange" | "red" {
  switch (level) {
    case "high":
      return "green"
    case "medium":
      return "yellow"
    case "low":
      return "orange"
    default:
      return "red"
  }
}
