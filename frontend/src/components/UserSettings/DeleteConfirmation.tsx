import { UsersService } from "@/client"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { useAuth } from "@/hooks/auth"
import { queryKeys } from "@/lib/queryConfig"
import { useTranslation } from "react-i18next"

const DeleteConfirmation = () => {
  const { logout } = useAuth()
  const { t } = useTranslation("common")

  return (
    <ConfirmationDialog
      triggerButtonText={t("deleteAccount.confirmButton")}
      triggerButtonProps={{ mt: 4 }}
      title={t("deleteAccount.confirmationRequired")}
      message={t("deleteAccount.confirmationMessage")}
      confirmButtonText={t("deleteAccount.confirmButton")}
      successMessage={t("deleteAccount.success")}
      mutationFn={() => UsersService.deleteUserMe()}
      onSuccess={logout}
      invalidateQueries={[[...queryKeys.user()]]}
    />
  )
}

export default DeleteConfirmation
