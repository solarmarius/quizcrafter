import { Button, HStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface UnsupportedEditorProps {
  questionType: string
  onCancel: () => void
}

export const UnsupportedEditor = memo(function UnsupportedEditor({
  questionType,
  onCancel,
}: UnsupportedEditorProps) {
  const { t } = useTranslation(["validation", "common"])

  return (
    <>
      <div
        style={{
          padding: "16px",
          backgroundColor: "#fed7d7",
          borderRadius: "8px",
          borderLeft: "4px solid #f56565",
        }}
      >
        <p style={{ fontWeight: "600", color: "#c53030", marginBottom: "4px" }}>
          {t("validation:editors.unsupportedType")}
        </p>
        <p style={{ fontSize: "14px", color: "#9c4221" }}>
          {t("validation:editors.unsupportedMessage", { questionType })}
        </p>
      </div>

      <HStack gap={3} justify="end">
        <Button variant="outline" onClick={onCancel}>
          {t("common:actions.close")}
        </Button>
      </HStack>
    </>
  )
})
