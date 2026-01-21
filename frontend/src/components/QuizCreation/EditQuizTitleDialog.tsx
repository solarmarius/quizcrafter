import { Button, ButtonGroup, Input, Text } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { LuPencil } from "react-icons/lu"

import type { ApiError } from "@/client"
import { QuizService } from "@/client"
import { FormField } from "@/components/forms"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCustomToast, useErrorHandler } from "@/hooks/common"
import { queryKeys } from "@/lib/queryConfig"

interface EditQuizTitleDialogProps {
  quizId: string
  currentTitle: string
}

interface FormData {
  title: string
}

const EditQuizTitleDialog = ({
  quizId,
  currentTitle,
}: EditQuizTitleDialogProps) => {
  const { t } = useTranslation("quiz")
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { handleError } = useErrorHandler()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: { title: currentTitle },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      QuizService.updateQuizEndpoint({
        quizId,
        requestBody: { title: data.title },
      }),
    onSuccess: () => {
      showSuccessToast(t("editTitle.success"))
      setIsOpen(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.quiz(quizId) })
      queryClient.invalidateQueries({ queryKey: ["quizzes"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  const handleOpenChange = (details: { open: boolean }) => {
    setIsOpen(details.open)
    if (details.open) {
      reset({ title: currentTitle })
    }
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("editTitle.ariaLabel")}
        >
          <LuPencil />
          {t("actions.editTitle")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>{t("editTitle.title")}</DialogTitle>
            <Text fontSize="sm" color="fg.muted">
              {t("editTitle.canvasNote")}
            </Text>
          </DialogHeader>
          <DialogBody>
            <FormField
              label={t("editTitle.label")}
              error={errors.title?.message}
              isRequired
            >
              <Input
                {...register("title", {
                  required: t("editTitle.required"),
                  minLength: {
                    value: 1,
                    message: t("editTitle.minLength"),
                  },
                  maxLength: {
                    value: 255,
                    message: t("editTitle.maxLength"),
                  },
                })}
                placeholder={t("editTitle.placeholder")}
                autoFocus
              />
            </FormField>
          </DialogBody>

          <DialogFooter gap={2}>
            <ButtonGroup>
              <DialogActionTrigger asChild>
                <Button
                  variant="subtle"
                  colorPalette="gray"
                  disabled={isSubmitting}
                >
                  {t("actions.cancel")}
                </Button>
              </DialogActionTrigger>
              <Button
                variant="solid"
                colorPalette="blue"
                type="submit"
                loading={isSubmitting}
                disabled={!isDirty}
              >
                {t("editTitle.save")}
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default EditQuizTitleDialog
