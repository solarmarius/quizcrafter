import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  HStack,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { LuCopy, LuPlus, LuShare2, LuTrash2, LuUserMinus } from "react-icons/lu"

import {
  type CollaboratorResponse,
  type QuizInviteResponse,
  QuizSharingService,
} from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toaster } from "@/components/ui/toaster"
import { queryKeys } from "@/lib/queryConfig"

interface ShareQuizDialogProps {
  quizId: string
  quizTitle: string
}

export function ShareQuizDialog({ quizId, quizTitle }: ShareQuizDialogProps) {
  const { t } = useTranslation("quiz")
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.quizCollaborators(quizId),
    queryFn: () => QuizSharingService.listCollaborators({ quizId }),
    enabled: isOpen,
  })

  const createInviteMutation = useMutation({
    mutationFn: () =>
      QuizSharingService.createInvite({
        quizId,
        requestBody: { expires_in_days: 7, max_uses: null },
      }),
    onSuccess: (newInvite) => {
      toaster.create({ title: t("sharing.inviteCreated"), type: "success" })
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizCollaborators(quizId),
      })
      // Copy link to clipboard
      navigator.clipboard.writeText(newInvite.invite_url)
      toaster.create({ title: t("sharing.linkCopied"), type: "info" })
    },
    onError: (error: Error & { status?: number }) => {
      if (error.status === 409) {
        toaster.create({
          title: t("sharing.inviteAlreadyExists"),
          description: t("sharing.inviteAlreadyExistsDescription"),
          type: "error",
        })
      } else {
        toaster.create({
          title: t("sharing.createInviteFailed"),
          type: "error",
        })
      }
    },
  })

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      QuizSharingService.revokeInviteEndpoint({ quizId, inviteId }),
    onSuccess: () => {
      toaster.create({ title: t("sharing.inviteRevoked"), type: "success" })
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizCollaborators(quizId),
      })
    },
    onError: () => {
      toaster.create({ title: t("sharing.revokeInviteFailed"), type: "error" })
    },
  })

  const removeCollaboratorMutation = useMutation({
    mutationFn: (collaboratorId: string) =>
      QuizSharingService.removeCollaboratorEndpoint({ quizId, collaboratorId }),
    onSuccess: () => {
      toaster.create({
        title: t("sharing.collaboratorRemoved"),
        type: "success",
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.quizCollaborators(quizId),
      })
    },
    onError: () => {
      toaster.create({
        title: t("sharing.removeCollaboratorFailed"),
        type: "error",
      })
    },
  })

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    toaster.create({ title: t("sharing.linkCopied"), type: "info" })
  }

  const handleOpenChange = (details: { open: boolean }) => {
    setIsOpen(details.open)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "lg" }}
      placement="center"
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LuShare2 />
          {t("sharing.shareQuiz")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>{t("sharing.manageSharing")}</DialogTitle>
          <Text fontSize="sm" color="fg.muted">
            {quizTitle}
          </Text>
        </DialogHeader>

        <DialogBody pb={6}>
          {isLoading ? (
            <VStack py={8}>
              <Spinner size="lg" />
            </VStack>
          ) : error ? (
            <Text color="red.500">{t("sharing.loadError")}</Text>
          ) : (
            <VStack gap={6} align="stretch">
              {/* Collaborators Section */}
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="semibold">
                    {t("sharing.collaborators")}
                  </Text>
                </HStack>
                {data?.collaborators && data.collaborators.length > 0 ? (
                  <VStack gap={2} align="stretch">
                    {data.collaborators.map((collaborator) => (
                      <CollaboratorItem
                        key={collaborator.id}
                        collaborator={collaborator}
                        onRemove={() =>
                          removeCollaboratorMutation.mutate(collaborator.id)
                        }
                        isRemoving={removeCollaboratorMutation.isPending}
                      />
                    ))}
                  </VStack>
                ) : (
                  <Text color="fg.muted" fontSize="sm">
                    {t("sharing.noCollaborators")}
                  </Text>
                )}
              </Box>

              {/* Active Invites Section */}
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="semibold">
                    {t("sharing.activeInvites")}
                  </Text>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={() => createInviteMutation.mutate()}
                    disabled={createInviteMutation.isPending}
                  >
                    {createInviteMutation.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <LuPlus />
                    )}
                    {t("sharing.createInvite")}
                  </Button>
                </HStack>
                {data?.active_invites && data.active_invites.length > 0 ? (
                  <VStack gap={2} align="stretch">
                    {data.active_invites.map((invite) => (
                      <InviteItem
                        key={invite.id}
                        invite={invite}
                        onCopy={() => copyToClipboard(invite.invite_url)}
                        onRevoke={() => revokeInviteMutation.mutate(invite.id)}
                        isRevoking={revokeInviteMutation.isPending}
                      />
                    ))}
                  </VStack>
                ) : (
                  <Text color="fg.muted" fontSize="sm">
                    {t("sharing.noActiveInvites")}
                  </Text>
                )}
              </Box>
            </VStack>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}

interface CollaboratorItemProps {
  collaborator: CollaboratorResponse
  onRemove: () => void
  isRemoving: boolean
}

function CollaboratorItem({
  collaborator,
  onRemove,
  isRemoving,
}: CollaboratorItemProps) {
  const { t } = useTranslation("quiz")

  return (
    <HStack
      p={3}
      borderWidth="1px"
      borderRadius="md"
      justify="space-between"
      bg="bg.subtle"
    >
      <Text fontSize="sm" fontWeight="medium">
        {collaborator.user_name || t("sharing.unknownUser")}
      </Text>
      <IconButton
        aria-label={t("sharing.removeCollaborator")}
        variant="ghost"
        colorPalette="red"
        size="sm"
        onClick={onRemove}
        disabled={isRemoving}
      >
        <LuUserMinus />
      </IconButton>
    </HStack>
  )
}

interface InviteItemProps {
  invite: QuizInviteResponse
  onCopy: () => void
  onRevoke: () => void
  isRevoking: boolean
}

function InviteItem({ invite, onCopy, onRevoke, isRevoking }: InviteItemProps) {
  const { t } = useTranslation("quiz")

  const getExpirationText = () => {
    if (!invite.expires_at) return t("sharing.noExpiration")
    const expiresAt = new Date(invite.expires_at)
    const now = new Date()
    const daysRemaining = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    return t("sharing.expiresIn", { days: daysRemaining })
  }

  const getUsesText = () => {
    if (invite.max_uses === null) {
      return t("sharing.usedCount", { count: invite.use_count })
    }
    return t("sharing.uses", { count: invite.use_count, max: invite.max_uses })
  }

  return (
    <HStack
      p={3}
      borderWidth="1px"
      borderRadius="md"
      justify="space-between"
      bg="bg.subtle"
    >
      <VStack align="start" gap={1}>
        <HStack gap={2}>
          <Badge colorPalette="blue" size="sm">
            {getExpirationText()}
          </Badge>
          <Badge colorPalette="gray" size="sm">
            {getUsesText()}
          </Badge>
        </HStack>
        <Text fontSize="xs" color="fg.muted" maxW="200px" truncate>
          {invite.invite_url}
        </Text>
      </VStack>
      <ButtonGroup size="sm">
        <IconButton
          aria-label={t("sharing.copyLink")}
          variant="ghost"
          onClick={onCopy}
        >
          <LuCopy />
        </IconButton>
        <IconButton
          aria-label={t("sharing.revokeInvite")}
          variant="ghost"
          colorPalette="red"
          onClick={onRevoke}
          disabled={isRevoking}
        >
          <LuTrash2 />
        </IconButton>
      </ButtonGroup>
    </HStack>
  )
}

export default ShareQuizDialog
