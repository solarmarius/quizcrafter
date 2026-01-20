import { useMemo } from "react"
import { useTranslation } from "react-i18next"

type DateFormat = "default" | "short" | "long" | "time-only"

/**
 * Maps i18n language codes to Intl locale codes for date formatting.
 * Norwegian uses nb-NO (Bokmål) as the standard written form.
 */
const getLocaleFromLanguage = (language: string): string => {
  switch (language) {
    case "no":
      return "nb-NO"
    default:
      return "en-GB"
  }
}

const formatOptions: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  default: {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  short: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  long: {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  },
  "time-only": {
    hour: "2-digit",
    minute: "2-digit",
  },
}

/**
 * Hook for consistent date formatting across the application.
 * Automatically uses the current i18n language for locale-aware formatting.
 * Provides memoized date formatting with multiple predefined formats and safe error handling.
 *
 * @param date - The date to format (string, Date object, or null/undefined)
 * @param format - The format type to use (default: "default")
 * @param localeOverride - Optional locale override (uses i18n language if not provided)
 *
 * @returns Formatted date string or null if date is invalid/empty
 *
 * @example
 * ```tsx
 * // Basic usage with default format (uses current i18n language)
 * const formattedDate = useFormattedDate(quiz.created_at)
 * // Result (en): "12 January 2024, 14:30"
 * // Result (no): "12. januar 2024, 14:30"
 *
 * // Using different formats
 * const shortDate = useFormattedDate(quiz.created_at, "short")
 * // Result: "12 Jan 2024, 14:30"
 *
 * const longDate = useFormattedDate(quiz.created_at, "long")
 * // Result: "12 January 2024, 14:30:45"
 *
 * const timeOnly = useFormattedDate(quiz.created_at, "time-only")
 * // Result: "14:30"
 *
 * // Using custom locale override
 * const usDate = useFormattedDate(quiz.created_at, "default", "en-US")
 * // Result: "January 12, 2024, 02:30 PM"
 *
 * // Safe handling of null/undefined dates
 * const safeDate = useFormattedDate(null) // Returns null
 * const invalidDate = useFormattedDate("invalid-date") // Returns null
 *
 * // Usage in components
 * return (
 *   <div>
 *     <p>Created: {useFormattedDate(quiz.created_at)}</p>
 *     <p>Updated: {useFormattedDate(quiz.updated_at, "short")}</p>
 *     <p>Time: {useFormattedDate(quiz.created_at, "time-only")}</p>
 *   </div>
 * )
 * ```
 */
export function useFormattedDate(
  date: string | Date | null | undefined,
  format: DateFormat = "default",
  localeOverride?: string,
): string | null {
  const { i18n } = useTranslation()
  const locale = localeOverride ?? getLocaleFromLanguage(i18n.language)

  return useMemo(() => {
    if (!date) return null

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date

      if (Number.isNaN(dateObj.getTime())) {
        return null
      }

      return dateObj.toLocaleDateString(locale, formatOptions[format])
    } catch {
      return null
    }
  }, [date, format, locale])
}
