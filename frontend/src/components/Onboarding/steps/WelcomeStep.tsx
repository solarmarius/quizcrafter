import { Box, Stack, Text } from "@chakra-ui/react";

export const WelcomeStep = () => {
  return (
    <Stack gap={6} align="center" py={8} minH="300px" justify="center">
      <Box textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" color="ui.main" mb={4}>
          Welcome to QuizCrafter
        </Text>
        <Text fontSize="lg" color="gray.600" lineHeight="tall" mb={6}>
          Thanks for trying us out. Let us show you around and help you get
          started with everything our application has to offer.
        </Text>
        <Box
          bg="orange.50"
          border="1px"
          borderColor="orange.200"
          borderRadius="md"
          px={4}
          py={3}
        >
          <Text color="orange.700" fontWeight="medium">
            ⚠️ This application is currently in a student-driven development
            phase and has not yet been officially released. Please be aware that
            ongoing support and future development are not guaranteed. Features
            may change or be discontinued at any time.
          </Text>
        </Box>
      </Box>
    </Stack>
  );
};
