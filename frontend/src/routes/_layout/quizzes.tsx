import { Box, Card, Container, HStack, Text, VStack } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink, createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  QuizTable,
  QuizTableSkeleton,
} from "@/components/Common"
import { Button } from "@/components/ui/button"
import { useUserQuizzes } from "@/hooks/api"
import { useErrorHandler } from "@/hooks/common"
import { UI_SIZES } from "@/lib/constants"
import { queryKeys } from "@/lib/queryConfig"

export const Route = createFileRoute("/_layout/quizzes")({
  component: QuizList,
})

function QuizList() {
  const { handleError } = useErrorHandler()
  const queryClient = useQueryClient()
  const { t } = useTranslation(["dashboard", "quiz"])

  // Force fresh data every time user visits this route
  // This ensures quiz status updates are immediately visible
  useEffect(() => {
    queryClient.refetchQueries({ queryKey: queryKeys.userQuizzes() })
  }, [queryClient])

  const { data: quizzes, isLoading, error } = useUserQuizzes()

  if (isLoading) {
    return <QuizListSkeleton />
  }

  if (error) {
    handleError(error)
    return (
      <Container maxW="6xl" py={8}>
        <Card.Root>
          <Card.Body>
            <ErrorState
              title={t("quizList.loadFailed")}
              message={t("quizList.loadFailedMessage")}
              showRetry={false}
            />
          </Card.Body>
        </Card.Root>
      </Container>
    )
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Box>
            <Text fontSize="3xl" fontWeight="bold">
              {t("quizList.title")}
            </Text>
            <Text color="gray.600">{t("quizList.description")}</Text>
          </Box>
          <Button asChild>
            <RouterLink to="/create-quiz">
              {t("quiz:actions.createQuiz")}
            </RouterLink>
          </Button>
        </HStack>

        {/* Quizzes Table */}
        {!quizzes || quizzes.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <EmptyState
                title={t("quiz:emptyStates.noQuizzes")}
                description={t("quizList.emptyDescription")}
                action={
                  <Button asChild>
                    <RouterLink to="/create-quiz">
                      {t("quiz:actions.createFirstQuiz")}
                    </RouterLink>
                  </Button>
                }
              />
            </Card.Body>
          </Card.Root>
        ) : (
          <QuizTable quizzes={quizzes} />
        )}
      </VStack>
    </Container>
  )
}

function QuizListSkeleton() {
  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header Skeleton */}
        <HStack justify="space-between" align="center">
          <Box>
            <LoadingSkeleton
              height={UI_SIZES.SKELETON.HEIGHT.XXL}
              width={UI_SIZES.SKELETON.WIDTH.TEXT_LG}
            />
            <Box mt={2}>
              <LoadingSkeleton
                height={UI_SIZES.SKELETON.HEIGHT.LG}
                width={UI_SIZES.SKELETON.WIDTH.TEXT_XL}
              />
            </Box>
          </Box>
          <LoadingSkeleton
            height={UI_SIZES.SKELETON.HEIGHT.XXL}
            width={UI_SIZES.SKELETON.WIDTH.TEXT_MD}
          />
        </HStack>

        {/* Table Skeleton */}
        <QuizTableSkeleton />
      </VStack>
    </Container>
  )
}
