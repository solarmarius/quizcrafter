import { Card, HStack, Table, VStack } from "@chakra-ui/react"
import { memo } from "react"
import { useTranslation } from "react-i18next"

import { UI_SIZES } from "@/lib/constants"
import { LoadingSkeleton } from "./LoadingSkeleton"

interface QuizTableSkeletonProps {
  rows?: number
}

export const QuizTableSkeleton = memo(function QuizTableSkeleton({
  rows = 5,
}: QuizTableSkeletonProps) {
  const { t } = useTranslation("dashboard")

  return (
    <Card.Root>
      <Card.Body p={0}>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t("table.quizTitle")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.course")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.questions")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.status")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.created")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.actions")}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {Array.from({ length: rows }, (_, i) => (
              <Table.Row key={i}>
                <Table.Cell>
                  <VStack align="start" gap={1}>
                    <LoadingSkeleton
                      height={UI_SIZES.SKELETON.HEIGHT.MD}
                      width={UI_SIZES.SKELETON.WIDTH.TEXT_LG}
                    />
                    <LoadingSkeleton
                      height={UI_SIZES.SKELETON.HEIGHT.SM}
                      width={UI_SIZES.SKELETON.WIDTH.TEXT_MD}
                    />
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <VStack align="start" gap={1}>
                    <LoadingSkeleton
                      height={UI_SIZES.SKELETON.HEIGHT.MD}
                      width={UI_SIZES.SKELETON.WIDTH.TEXT_MD}
                    />
                    <LoadingSkeleton
                      height={UI_SIZES.SKELETON.HEIGHT.SM}
                      width={UI_SIZES.SKELETON.WIDTH.LG}
                    />
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <LoadingSkeleton
                    height={UI_SIZES.SKELETON.HEIGHT.LG}
                    width={UI_SIZES.SKELETON.WIDTH.MD}
                  />
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2} align="center">
                    <LoadingSkeleton
                      height={UI_SIZES.SKELETON.HEIGHT.SM}
                      width={UI_SIZES.SKELETON.WIDTH.SM}
                    />
                    <LoadingSkeleton
                      height={UI_SIZES.SKELETON.HEIGHT.SM}
                      width={UI_SIZES.SKELETON.WIDTH.TEXT_MD}
                    />
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <LoadingSkeleton
                    height={UI_SIZES.SKELETON.HEIGHT.SM}
                    width={UI_SIZES.SKELETON.WIDTH.LG}
                  />
                </Table.Cell>
                <Table.Cell>
                  <LoadingSkeleton
                    height={UI_SIZES.SKELETON.HEIGHT.XL}
                    width={UI_SIZES.SKELETON.WIDTH.MD}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Body>
    </Card.Root>
  )
})
