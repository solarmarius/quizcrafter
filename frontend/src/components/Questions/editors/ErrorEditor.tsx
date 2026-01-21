import { ErrorState } from "@/components/Common"
import { Button, HStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface ErrorEditorProps {
  error: string
  onCancel: () => void
}

export const ErrorEditor = memo(function ErrorEditor({
  error,
  onCancel,
}: ErrorEditorProps) {
  const { t } = useTranslation(["validation", "common"])

  return (
    <>
      <ErrorState
        title={t("validation:editors.editorError")}
        message={error}
        showRetry={false}
        variant="inline"
      />
      <HStack gap={3} justify="end" mt={4}>
        <Button variant="outline" onClick={onCancel}>
          {t("common:actions.close")}
        </Button>
      </HStack>
    </>
  )
})
