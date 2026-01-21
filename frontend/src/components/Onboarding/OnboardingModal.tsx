import { Button, Card, HStack, Stack, Text } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import {
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
} from "../ui/dialog"
import { FeatureStep } from "./steps/FeatureStep"
import { LanguagePreferenceStep } from "./steps/LanguagePreferenceStep"
import { PrivacyPolicyStep } from "./steps/PrivacyPolicyStep"
import { SetupStep } from "./steps/SetupStep"
import { WelcomeStep } from "./steps/WelcomeStep"

interface OnboardingModalProps {
  isOpen: boolean
  currentStep: number
  onNext: () => void
  onPrevious: () => void
  onComplete: () => void
}

export const OnboardingModal = ({
  isOpen,
  currentStep,
  onNext,
  onPrevious,
  onComplete,
}: OnboardingModalProps) => {
  const { t } = useTranslation("common")
  const totalSteps = 5
  const progressValue = (currentStep / totalSteps) * 100

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep />
      case 2:
        return <LanguagePreferenceStep />
      case 3:
        return <SetupStep />
      case 4:
        return <FeatureStep />
      case 5:
        return <PrivacyPolicyStep />
      default:
        return <WelcomeStep />
    }
  }

  const isLastStep = currentStep === totalSteps
  const isFirstStep = currentStep === 1

  return (
    <DialogRoot open={isOpen} size="lg" placement="center">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <Stack gap={3}>
            <HStack justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">
                {t("onboarding.stepProgress", {
                  current: currentStep,
                  total: totalSteps,
                })}
              </Text>
            </HStack>
            <Stack bg="gray.100" h="2" borderRadius="full" overflow="hidden">
              <Stack
                bg="teal.500"
                h="full"
                width={`${progressValue}%`}
                borderRadius="full"
                transition="width 0.3s"
              />
            </Stack>
          </Stack>
        </DialogHeader>

        <DialogBody>
          <Card.Root
            variant="elevated"
            size="lg"
            _hover={{
              transform: "translateY(-2px)",
              shadow: "lg",
            }}
            transition="all 0.2s"
          >
            <Card.Body>{renderCurrentStep()}</Card.Body>
          </Card.Root>
        </DialogBody>

        <DialogFooter>
          <HStack justify="space-between" width="full">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={isFirstStep}
              visibility={isFirstStep ? "hidden" : "visible"}
            >
              {t("actions.previous")}
            </Button>

            <Button
              colorPalette="teal"
              onClick={isLastStep ? onComplete : onNext}
            >
              {isLastStep ? t("actions.getStarted") : t("actions.next")}
            </Button>
          </HStack>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
