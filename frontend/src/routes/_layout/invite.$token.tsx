import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LuCheck, LuUsers, LuX } from "react-icons/lu"

import { QuizSharingService } from "@/client"
import { ErrorState, LoadingSkeleton } from "@/components/Common"
import { toaster } from "@/components/ui/toaster"
import { queryKeys } from "@/lib/queryConfig"

export const Route = createFileRoute("/_layout/invite/$token")({
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { t } = useTranslation("quiz")
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: inviteInfo,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => QuizSharingService.getInviteInfo({ token }),
  })

  const acceptMutation = useMutation({
    mutationFn: () => QuizSharingService.acceptInvite({ token }),
    onSuccess: (data) => {
      toaster.create({
        title: t("sharing.invite.acceptSuccess"),
        description: data.message,
        type: "success",
      })
      // Invalidate quizzes list to include the new shared quiz
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes() })
      // Navigate to the quiz
      navigate({ to: "/quiz/$id", params: { id: data.quiz_id } })
    },
    onError: (error: Error & { status?: number }) => {
      const status = error.status
      let errorMessage = t("sharing.invite.acceptError")

      if (status === 410) {
        errorMessage = t("sharing.invite.expired")
      } else if (status === 404) {
        errorMessage = t("sharing.invite.notFound")
      }

      toaster.create({
        title: t("sharing.invite.acceptFailed"),
        description: errorMessage,
        type: "error",
      })
    },
  })

  if (isLoading) {
    return <InvitePageSkeleton />
  }

  if (error) {
    return (
      <Container maxW="md" py={16}>
        <Card.Root>
          <Card.Body>
            <ErrorState
              title={t("sharing.invite.loadError")}
              message={t("sharing.invite.loadErrorMessage")}
              showRetry={false}
            />
          </Card.Body>
        </Card.Root>
      </Container>
    )
  }

  if (!inviteInfo) {
    return null
  }

  const isValid = inviteInfo.is_valid

  return (
    <Container maxW="md" py={16}>
      <Card.Root>
        <Card.Body>
          <VStack gap={6} align="center" textAlign="center">
            {/* Icon */}
            <Box
              p={4}
              borderRadius="full"
              bg={isValid ? "blue.100" : "red.100"}
              color={isValid ? "blue.600" : "red.600"}
            >
              <LuUsers size={32} />
            </Box>

            {/* Title */}
            <Text fontSize="2xl" fontWeight="bold">
              {t("sharing.invite.title")}
            </Text>

            {isValid ? (
              <>
                {/* Quiz Info */}
                <VStack gap={2}>
                  <Text fontSize="lg" color="gray.600">
                    {t("sharing.invite.invitedTo")}
                  </Text>
                  <Text fontSize="xl" fontWeight="semibold">
                    {inviteInfo.quiz_title}
                  </Text>
                  {inviteInfo.owner_name && (
                    <Text color="gray.500">
                      {t("sharing.invite.sharedBy", {
                        name: inviteInfo.owner_name,
                      })}
                    </Text>
                  )}
                </VStack>

                {/* Description */}
                <Text color="gray.600" maxW="sm">
                  {t("sharing.invite.description")}
                </Text>

                {/* Action Buttons */}
                <HStack gap={4} pt={4}>
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/" })}
                    disabled={acceptMutation.isPending}
                  >
                    <LuX />
                    {t("sharing.invite.decline")}
                  </Button>
                  <Button
                    colorPalette="blue"
                    onClick={() => acceptMutation.mutate()}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <LuCheck />
                    )}
                    {t("sharing.invite.accept")}
                  </Button>
                </HStack>
              </>
            ) : (
              <>
                {/* Invalid Invite */}
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{t("sharing.invite.invalidTitle")}</Alert.Title>
                    <Alert.Description>
                      {inviteInfo.message || t("sharing.invite.invalidMessage")}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>

                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                  mt={4}
                >
                  {t("sharing.invite.goHome")}
                </Button>
              </>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </Container>
  )
}

function InvitePageSkeleton() {
  return (
    <Container maxW="md" py={16}>
      <Card.Root>
        <Card.Body>
          <VStack gap={6} align="center">
            <LoadingSkeleton height="64px" width="64px" />
            <LoadingSkeleton height="32px" width="200px" />
            <LoadingSkeleton height="24px" width="300px" />
            <LoadingSkeleton height="20px" width="250px" />
            <LoadingSkeleton height="40px" width="150px" />
          </VStack>
        </Card.Body>
      </Card.Root>
    </Container>
  )
}
