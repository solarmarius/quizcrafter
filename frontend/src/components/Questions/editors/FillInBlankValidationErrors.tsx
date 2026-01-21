/**
 * Validation error display component for Fill-in-the-Blank questions
 * Shows specific validation errors with clear messaging and actionable guidance
 */

import {
  type BlankValidationError,
  BlankValidationErrorCode,
} from "@/types/fillInBlankValidation"
import { Box, Text, VStack } from "@chakra-ui/react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

interface FillInBlankValidationErrorsProps {
  errors: BlankValidationError[]
  className?: string
}

interface ErrorConfig {
  severity: "error" | "warning" | "info"
  colorScheme: string
  suggestionKey: string
  suggestionCount: number
}

/**
 * Configuration for different error types with suggestion keys
 */
const ERROR_CONFIGS: Record<BlankValidationErrorCode, ErrorConfig> = {
  [BlankValidationErrorCode.INVALID_TAG_FORMAT]: {
    severity: "error",
    colorScheme: "red",
    suggestionKey: "invalidTagFormat",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.CASE_SENSITIVITY_ERROR]: {
    severity: "error",
    colorScheme: "red",
    suggestionKey: "caseSensitivity",
    suggestionCount: 2,
  },
  [BlankValidationErrorCode.DUPLICATE_POSITIONS]: {
    severity: "error",
    colorScheme: "red",
    suggestionKey: "duplicatePositions",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.NON_SEQUENTIAL_POSITIONS]: {
    severity: "error",
    colorScheme: "red",
    suggestionKey: "nonSequentialPositions",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.POSITION_GAP]: {
    severity: "error",
    colorScheme: "red",
    suggestionKey: "positionGap",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.MISSING_BLANK_CONFIG]: {
    severity: "error",
    colorScheme: "orange",
    suggestionKey: "missingBlankConfig",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.EXTRA_BLANK_CONFIG]: {
    severity: "error",
    colorScheme: "orange",
    suggestionKey: "extraBlankConfig",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.UNSYNCHRONIZED_BLANKS]: {
    severity: "error",
    colorScheme: "orange",
    suggestionKey: "unsynchronizedBlanks",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.NO_BLANKS_IN_TEXT]: {
    severity: "error",
    colorScheme: "blue",
    suggestionKey: "noBlanksInText",
    suggestionCount: 3,
  },
  [BlankValidationErrorCode.NO_BLANK_CONFIGURATIONS]: {
    severity: "error",
    colorScheme: "blue",
    suggestionKey: "noBlankConfigurations",
    suggestionCount: 3,
  },
}

/**
 * Individual error display component
 */
function ValidationErrorItem({
  error,
  t,
}: {
  error: BlankValidationError
  t: TFunction<"validation", undefined>
}) {
  const config = ERROR_CONFIGS[error.code]

  const getBorderColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "red.400"
      case "warning":
        return "orange.400"
      case "info":
        return "blue.400"
      default:
        return "gray.400"
    }
  }

  const getBgColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "red.50"
      case "warning":
        return "orange.50"
      case "info":
        return "blue.50"
      default:
        return "gray.50"
    }
  }

  // Get translated suggestions - use type assertion for dynamic keys
  const suggestions: string[] = Array.from(
    { length: config.suggestionCount },
    (_, i) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t as any)(`fillInBlank.suggestions.${config.suggestionKey}.${i + 1}`),
  )

  return (
    <Box
      p={3}
      bg={getBgColor(config.severity)}
      borderRadius="md"
      borderLeft="4px solid"
      borderColor={getBorderColor(config.severity)}
      mb={3}
    >
      <Text
        fontWeight="medium"
        fontSize="sm"
        mb={2}
        color={`${config.colorScheme}.700`}
      >
        {error.message}
      </Text>

      {suggestions.length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
            {t("fillInBlank.howToFix")}
          </Text>
          <Box pl={2}>
            {suggestions.map((suggestion, index) => (
              <Text key={index} fontSize="xs" color="gray.600" mb={1}>
                • {suggestion}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Show specific details if available */}
      {error.details && (
        <Box mt={2} p={2} bg="gray.100" borderRadius="sm">
          <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={1}>
            {t("fillInBlank.details")}
          </Text>
          {error.details.positions && (
            <Text fontSize="xs" color="gray.600">
              {t("fillInBlank.positions", {
                positions: error.details.positions.join(", "),
              })}
            </Text>
          )}
          {error.details.invalidTags && (
            <Text fontSize="xs" color="gray.600">
              {t("fillInBlank.invalidTags", {
                tags: error.details.invalidTags.join(", "),
              })}
            </Text>
          )}
          {error.details.missingPositions && (
            <Text fontSize="xs" color="gray.600">
              {t("fillInBlank.missingPositions", {
                positions: error.details.missingPositions.join(", "),
              })}
            </Text>
          )}
          {error.details.extraPositions && (
            <Text fontSize="xs" color="gray.600">
              {t("fillInBlank.extraPositions", {
                positions: error.details.extraPositions.join(", "),
              })}
            </Text>
          )}
        </Box>
      )}
    </Box>
  )
}

/**
 * Main validation errors display component
 */
export function FillInBlankValidationErrors({
  errors,
  className,
}: FillInBlankValidationErrorsProps) {
  const { t } = useTranslation("validation")

  if (!errors || errors.length === 0) {
    return null
  }

  // Group errors by severity
  const errorsBySeverity = errors.reduce(
    (acc, error) => {
      const config = ERROR_CONFIGS[error.code]
      const severity = config.severity

      if (!acc[severity]) {
        acc[severity] = []
      }
      acc[severity].push(error)

      return acc
    },
    {} as Record<string, BlankValidationError[]>,
  )

  const hasErrors = errorsBySeverity.error?.length > 0
  const hasWarnings = errorsBySeverity.warning?.length > 0

  return (
    <Box className={className} mb={4}>
      <VStack gap={3} align="stretch">
        {/* Header with error count */}
        <Box
          bg="red.50"
          p={3}
          borderRadius="md"
          borderLeft="4px solid"
          borderColor="red.400"
        >
          <Text fontWeight="bold" color="red.700" fontSize="sm">
            {t("fillInBlank.header", { count: errors.length })}
          </Text>
          <Text fontSize="xs" color="red.600" mt={1}>
            {t("fillInBlank.fixMessage")}
          </Text>
        </Box>

        {/* Critical errors */}
        {hasErrors && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="red.700" mb={2}>
              {t("fillInBlank.criticalIssues")}
            </Text>
            {errorsBySeverity.error.map((error, index) => (
              <ValidationErrorItem key={`error-${index}`} error={error} t={t} />
            ))}
          </Box>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="orange.700" mb={2}>
              {t("fillInBlank.warnings")}
            </Text>
            {errorsBySeverity.warning.map((error, index) => (
              <ValidationErrorItem
                key={`warning-${index}`}
                error={error}
                t={t}
              />
            ))}
          </Box>
        )}

        {/* Info messages */}
        {errorsBySeverity.info && errorsBySeverity.info.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="blue.700" mb={2}>
              {t("fillInBlank.information")}
            </Text>
            {errorsBySeverity.info.map((error, index) => (
              <ValidationErrorItem key={`info-${index}`} error={error} t={t} />
            ))}
          </Box>
        )}

        {/* Quick help */}
        <Box
          bg="blue.50"
          p={3}
          borderRadius="md"
          borderLeft="4px solid"
          borderColor="blue.300"
        >
          <Text fontSize="xs" fontWeight="medium" color="blue.700" mb={1}>
            {t("fillInBlank.quickHelp")}
          </Text>
          <Text fontSize="xs" color="blue.600">
            {t("fillInBlank.quickHelpText")}
          </Text>
        </Box>
      </VStack>
    </Box>
  )
}

/**
 * Compact error summary for inline display
 */
export function FillInBlankValidationSummary({
  errors,
}: { errors: BlankValidationError[] }) {
  const { t } = useTranslation("validation")

  if (!errors || errors.length === 0) {
    return null
  }

  const errorCount = errors.length
  const hasMultiple = errorCount > 1

  return (
    <Box
      bg="red.50"
      px={3}
      py={2}
      borderRadius="md"
      border="1px solid"
      borderColor="red.200"
    >
      <Text fontSize="xs" color="red.700" fontWeight="medium">
        ⚠️ {t("fillInBlank.errorCount", { count: errorCount })}
      </Text>
      <Text fontSize="xs" color="red.600" mt={1}>
        {errors[0].message}
        {hasMultiple &&
          ` ${t("fillInBlank.andMore", { count: errorCount - 1 })}`}
      </Text>
    </Box>
  )
}
