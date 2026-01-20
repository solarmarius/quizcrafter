import { Badge, Box, Card, HStack, Text, VStack } from "@chakra-ui/react"
import { Link as RouterLink } from "@tanstack/react-router"
import { memo, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { Quiz } from "@/client/types.gen"
import { EmptyState, QuizCard } from "@/components/Common"
import { Button } from "@/components/ui/button"
import { UI_SIZES } from "@/lib/constants"
import { getQuizzesBeingGenerated } from "@/lib/utils"
import { QuizGenerationPanelSkeleton } from "../QuizGenerationPanelSkeleton"

interface QuizGenerationPanelProps {
  quizzes: Quiz[]
  isLoading: boolean
}

export const QuizGenerationPanel = memo(function QuizGenerationPanel({
  quizzes,
  isLoading,
}: QuizGenerationPanelProps) {
  const { t } = useTranslation(["dashboard", "quiz"])
  const generatingQuizzes = useMemo(
    () => getQuizzesBeingGenerated(quizzes),
    [quizzes],
  )

  if (isLoading) {
    return <QuizGenerationPanelSkeleton />
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="semibold">
            {t("panels.generation.title")}
          </Text>
          <Badge variant="outline" colorScheme="orange" data-testid="badge">
            {generatingQuizzes.length}
          </Badge>
        </HStack>
        <Text fontSize="sm" color="gray.600">
          {t("panels.generation.description")}
        </Text>
      </Card.Header>
      <Card.Body>
        {generatingQuizzes.length === 0 ? (
          <EmptyState
            title={t("panels.generation.empty")}
            description={t("panels.generation.emptyDescription")}
            action={
              <Button size="sm" variant="outline" asChild>
                <RouterLink to="/create-quiz">
                  {t("quiz:actions.createQuiz")}
                </RouterLink>
              </Button>
            }
          />
        ) : (
          <VStack gap={4} align="stretch">
            {generatingQuizzes
              .slice(0, UI_SIZES.PANEL.MAX_ITEMS)
              .map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} variant="processing" />
              ))}

            {generatingQuizzes.length > UI_SIZES.PANEL.MAX_ITEMS && (
              <Box textAlign="center" pt={2}>
                <Text fontSize="sm" color="gray.500">
                  {t("panels.generation.moreInProgress", {
                    count: generatingQuizzes.length - UI_SIZES.PANEL.MAX_ITEMS,
                  })}
                </Text>
                <Button size="sm" variant="ghost" asChild mt={2}>
                  <RouterLink to="/quizzes">
                    {t("quiz:actions.viewAll")}
                  </RouterLink>
                </Button>
              </Box>
            )}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
})
