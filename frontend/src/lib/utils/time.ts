/**
 * Date and time utility functions
 */

/**
 * Safely parse a date string or Date object
 */
function parseDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date
}

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}

/**
 * Get relative time data from a timestamp for translation
 * Returns an object with the key suffix and count for i18n interpolation
 */
export function getRelativeTimeData(timestamp: string): {
  key: "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo"
  count: number
} | null {
  try {
    // Ensure the timestamp is treated as UTC if it doesn't have timezone info
    let normalizedTimestamp = timestamp
    if (
      !timestamp.includes("Z") &&
      !timestamp.includes("+") &&
      !timestamp.includes("-", 10)
    ) {
      normalizedTimestamp = `${timestamp}Z`
    }

    const date = new Date(normalizedTimestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return { key: "justNow", count: 0 }
    if (diffMins < 60) return { key: "minutesAgo", count: diffMins }

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return { key: "hoursAgo", count: diffHours }

    const diffDays = Math.floor(diffHours / 24)
    return { key: "daysAgo", count: diffDays }
  } catch {
    return null
  }
}

/**
 * Get the current timestamp as an ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
  const dateObj = parseDate(date)
  if (!isValidDate(dateObj)) return false

  const today = new Date()
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  )
}
