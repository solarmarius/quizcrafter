import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { QuizService } from "@/client"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"

interface DeleteQuizConfirmationProps {
  quizId: string
  quizTitle: string
}

const DeleteQuizConfirmation = ({
  quizId,
  quizTitle,
}: DeleteQuizConfirmationProps) => {
  const { t } = useTranslation("quiz")
  const navigate = useNavigate()

  const handleSuccess = () => {
    navigate({ to: "/quizzes" })
  }

  return (
    <ConfirmationDialog
      triggerButtonText={t("actions.deleteQuiz")}
      triggerButtonSize="sm"
      title={t("deleteConfirmation.title")}
      message={t("deleteConfirmation.message", { quizTitle })}
      confirmButtonText={t("actions.deleteQuiz")}
      successMessage={t("deleteConfirmation.success")}
      mutationFn={() => QuizService.deleteQuizEndpoint({ quizId })}
      onSuccess={handleSuccess}
      invalidateQueries={[["quizzes"]]}
    />
  )
}

export default DeleteQuizConfirmation
