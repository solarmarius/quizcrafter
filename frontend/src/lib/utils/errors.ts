import { ApiError } from "@/client"
import i18n from "@/i18n"

/**
 * Error handling utility functions
 */

export interface CanvasErrorInfo {
  isCanvasError: boolean
  isPermissionError: boolean
  userFriendlyMessage: string
  actionableGuidance: string
}

export interface ErrorDetails {
  message: string
  details?: string
  code?: string | number
  isRetryable: boolean
}

interface ValidationErrorItem {
  msg?: string
  message?: string
  type?: string
  input?: unknown
  ctx?: Record<string, unknown>
}

interface ApiErrorBody {
  detail?: string | ValidationErrorItem[]
  message?: string
  error?: string
}

/**
 * Analyze Canvas-specific errors and provide user-friendly messaging
 */
export function analyzeCanvasError(error: unknown): CanvasErrorInfo {
  // Default response for non-API errors
  if (!(error instanceof ApiError)) {
    return {
      isCanvasError: false,
      isPermissionError: false,
      userFriendlyMessage: i18n.t("errors.unexpected", { ns: "common" }),
      actionableGuidance: i18n.t("errors.contactSupport", { ns: "common" }),
    }
  }

  const isCanvasApiCall = error.url?.includes("/canvas") || false

  // Handle 401 errors from Canvas API calls (token expired)
  if (error.status === 401 && isCanvasApiCall) {
    return {
      isCanvasError: true,
      isPermissionError: true,
      userFriendlyMessage: i18n.t("errors.canvas.sessionExpired", {
        ns: "common",
      }),
      actionableGuidance: i18n.t("errors.canvas.sessionExpiredGuidance", {
        ns: "common",
      }),
    }
  }

  // Handle 403 errors from Canvas API calls
  if (error.status === 403 && isCanvasApiCall) {
    return {
      isCanvasError: true,
      isPermissionError: true,
      userFriendlyMessage: i18n.t("errors.canvas.noPermission", {
        ns: "common",
      }),
      actionableGuidance: i18n.t("errors.canvas.noPermissionGuidance", {
        ns: "common",
      }),
    }
  }

  // Handle other Canvas-related errors
  if (isCanvasApiCall) {
    if (error.status === 404) {
      return {
        isCanvasError: true,
        isPermissionError: false,
        userFriendlyMessage: i18n.t("errors.canvas.notFound", { ns: "common" }),
        actionableGuidance: i18n.t("errors.canvas.notFoundGuidance", {
          ns: "common",
        }),
      }
    }

    if (error.status === 500) {
      return {
        isCanvasError: true,
        isPermissionError: false,
        userFriendlyMessage: i18n.t("errors.canvas.serverError", {
          ns: "common",
        }),
        actionableGuidance: i18n.t("errors.canvas.serverErrorGuidance", {
          ns: "common",
        }),
      }
    }

    return {
      isCanvasError: true,
      isPermissionError: false,
      userFriendlyMessage: i18n.t("errors.canvas.connectionIssue", {
        ns: "common",
      }),
      actionableGuidance: i18n.t("errors.canvas.connectionGuidance", {
        ns: "common",
      }),
    }
  }

  // Generic API error
  return {
    isCanvasError: false,
    isPermissionError: false,
    userFriendlyMessage: i18n.t("errors.loadingData", { ns: "common" }),
    actionableGuidance: i18n.t("errors.contactSupport", { ns: "common" }),
  }
}

/**
 * Extract error details from various error types
 */
export function extractErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof ApiError) {
    const errorBody = error.body as ApiErrorBody | undefined
    const errDetail = errorBody?.detail
    let message = i18n.t("errors.apiError", { ns: "common" })

    if (typeof errDetail === "string") {
      message = errDetail
    } else if (Array.isArray(errDetail) && errDetail.length > 0) {
      const firstError = errDetail[0]
      message = firstError.msg || firstError.message || message
    }

    return {
      message,
      code: error.status,
      isRetryable:
        error.status >= 500 || error.status === 408 || error.status === 429,
      details: error.url
        ? i18n.t("errors.requestFailed", { url: error.url, ns: "common" })
        : undefined,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      isRetryable: false,
      details: error.stack,
    }
  }

  if (typeof error === "string") {
    return {
      message: error,
      isRetryable: false,
    }
  }

  return {
    message: i18n.t("errors.unknown", { ns: "common" }),
    isRetryable: false,
  }
}

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout")
    )
  }

  return false
}

/**
 * Check if an error indicates authentication issues
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401 || error.status === 403
  }
  return false
}

/**
 * Generate a user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    return i18n.t("errors.auth.loginRequired", { ns: "common" })
  }

  if (isNetworkError(error)) {
    return i18n.t("errors.network.issue", { ns: "common" })
  }

  const canvasInfo = analyzeCanvasError(error)
  if (canvasInfo.isCanvasError) {
    return canvasInfo.userFriendlyMessage
  }

  const details = extractErrorDetails(error)
  return details.message
}

/**
 * Get actionable guidance for an error
 */
export function getErrorActionableGuidance(error: unknown): string {
  if (isAuthError(error)) {
    return i18n.t("errors.auth.refreshGuidance", { ns: "common" })
  }

  if (isNetworkError(error)) {
    return i18n.t("errors.network.guidance", { ns: "common" })
  }

  const canvasInfo = analyzeCanvasError(error)
  if (canvasInfo.isCanvasError) {
    return canvasInfo.actionableGuidance
  }

  const details = extractErrorDetails(error)
  if (details.isRetryable) {
    return i18n.t("errors.retryable.temporary", { ns: "common" })
  }

  return i18n.t("errors.retryable.contactSupport", { ns: "common" })
}
