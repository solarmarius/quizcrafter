import { Box, Card, Heading, Image, List, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import { useTranslation } from "react-i18next"

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogRoot,
  DialogTrigger,
} from "@/components/ui/dialog"

interface QuestionTypeCardProps {
  typeKey: string
  imagePath: string
}

export const QuestionTypeCard: React.FC<QuestionTypeCardProps> = ({
  typeKey,
  imagePath,
}) => {
  const { t } = useTranslation("questionTypes")

  // Use type assertions for dynamic translation keys
  const validationObj = t(`types.${typeKey}.validation` as never, {
    returnObjects: true,
  }) as Record<string, string>
  const canvasObj = t(`types.${typeKey}.canvas` as never, {
    returnObjects: true,
  }) as Record<string, string>

  const validationKeys = Object.keys(validationObj)
  const canvasKeys = Object.keys(canvasObj)
  const typeName = t(`types.${typeKey}.name` as never) as string

  return (
    <Card.Root variant="outline" height="100%">
      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Heading size="lg">{typeName}</Heading>
          <Text color="gray.600">
            {t(`types.${typeKey}.description` as never) as string}
          </Text>

          <Box>
            <Heading size="sm" mb={2}>
              {t("sections.validation")}
            </Heading>
            <List.Root pl={4}>
              {validationKeys.map((key) => (
                <List.Item key={key}>
                  {t(`types.${typeKey}.validation.${key}` as never) as string}
                </List.Item>
              ))}
            </List.Root>
          </Box>

          <Box>
            <Heading size="sm" mb={2}>
              {t("sections.canvas")}
            </Heading>
            <List.Root pl={4}>
              {canvasKeys.map((key) => (
                <List.Item key={key}>
                  {t(`types.${typeKey}.canvas.${key}` as never) as string}
                </List.Item>
              ))}
            </List.Root>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
              {t("sections.example")}
            </Text>
            <DialogRoot size="xl">
              <DialogTrigger asChild>
                <Image
                  src={imagePath}
                  alt={typeName}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                  w="100%"
                  cursor="pointer"
                  _hover={{ opacity: 0.9, transform: "scale(1.01)" }}
                  transition="all 0.2s"
                />
              </DialogTrigger>
              <DialogContent>
                <DialogCloseTrigger />
                <DialogBody p={4}>
                  <Image
                    src={imagePath}
                    alt={typeName}
                    w="100%"
                    borderRadius="md"
                  />
                </DialogBody>
              </DialogContent>
            </DialogRoot>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
