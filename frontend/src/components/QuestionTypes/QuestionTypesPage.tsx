import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useTranslation } from "react-i18next"

import { QuestionTypeCard } from "./QuestionTypeCard"

const QUESTION_TYPES = [
  {
    key: "multipleChoice",
    imagePath: "/images/question-types/multiple-choice.png",
  },
  {
    key: "multipleAnswer",
    imagePath: "/images/question-types/multiple-answer.png",
  },
  { key: "trueFalse", imagePath: "/images/question-types/true-false.png" },
  { key: "matching", imagePath: "/images/question-types/connect.png" },
  {
    key: "fillInBlank",
    imagePath: "/images/question-types/fill-in-the-blank.png",
  },
  { key: "categorization", imagePath: "/images/question-types/category.png" },
]

export const QuestionTypesPage = () => {
  const { t } = useTranslation("questionTypes")

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            {t("page.title")}
          </Heading>
          <Text maxW="3xl" mx="auto">
            {t("page.intro")}
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
          {QUESTION_TYPES.map((type) => (
            <QuestionTypeCard
              key={type.key}
              typeKey={type.key}
              imagePath={type.imagePath}
            />
          ))}
        </SimpleGrid>
      </VStack>
    </Container>
  )
}
