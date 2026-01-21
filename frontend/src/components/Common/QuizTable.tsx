import { Card, Table } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

import type { Quiz } from "@/client/types.gen"
import { QuizTableRow } from "./QuizTableRow"

interface QuizTableProps {
  quizzes: Quiz[]
}

export const QuizTable = memo(function QuizTable({ quizzes }: QuizTableProps) {
  const { t } = useTranslation("quiz")

  return (
    <Card.Root>
      <Card.Body p={0}>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>
                {t("table.headers.title")}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {t("table.headers.course")}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {t("table.headers.questions")}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {t("table.headers.status")}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {t("table.headers.created")}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {t("table.headers.actions")}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quizzes.map((quiz) => (
              <QuizTableRow key={quiz.id} quiz={quiz} />
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Body>
    </Card.Root>
  )
})
