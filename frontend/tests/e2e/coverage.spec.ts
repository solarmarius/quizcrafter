import { expect, test } from "@playwright/test"
import {
  mockCoverageModuleList,
  mockModuleCoverage,
  mockQuizDetail,
  mockQuizQuestions,
  mockQuizStats,
  mockUserMe,
  mockUserQuizzes,
} from "../fixtures/api-mocking"
import {
  mockModuleCoverageResponse,
  mockModuleListResponse,
  mockQuestionsList,
  mockQuizList,
  mockQuizReadyForReview,
  mockQuizStats as mockStats,
  mockUser,
} from "../mocks"

test.describe("Coverage Analysis", () => {
  test.beforeEach(async ({ page }) => {
    // Common setup for all coverage tests
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(
      page,
      mockQuizReadyForReview.id!,
      mockQuizReadyForReview,
    )
    await mockQuizQuestions(page, mockQuizReadyForReview.id!, mockQuestionsList)
    await mockQuizStats(page, mockQuizReadyForReview.id!, mockStats)
    await mockCoverageModuleList(
      page,
      mockQuizReadyForReview.id!,
      mockModuleListResponse,
    )
  })

  test("displays coverage page with title and experimental warning", async ({
    page,
  }) => {
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Should display page title
    await expect(page.getByText("Content Coverage")).toBeVisible()

    // Should display experimental warning alert
    await expect(page.getByText("Experimental Feature")).toBeVisible()
    await expect(page.getByText(/may not be 100% accurate/i)).toBeVisible()
  })

  test("shows explanation toggle tip with coverage thresholds", async ({
    page,
  }) => {
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Click the info button to open toggle tip
    const infoButton = page.getByRole("button", { name: /how coverage/i })
    await infoButton.click()

    // Should display explanation content
    await expect(page.getByText(/semantic similarity/i)).toBeVisible()
    await expect(page.getByText(/High.*≥70%/)).toBeVisible()
    await expect(page.getByText(/Medium.*50-69%/)).toBeVisible()
    await expect(page.getByText(/Low.*30-49%/)).toBeVisible()
    await expect(page.getByText(/None.*<30%/)).toBeVisible()
  })

  test("displays module selector with available modules", async ({ page }) => {
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Should display module selection header
    await expect(page.getByText("Select a Module")).toBeVisible()

    // Should display available modules
    await expect(page.getByText("Introduction and Overview")).toBeVisible()
    await expect(page.getByText("Machine Learning Basics")).toBeVisible()

    // Should show question counts
    await expect(page.getByText("3 questions")).toBeVisible()
    await expect(page.getByText("2 questions")).toBeVisible()
  })

  test("navigates to module coverage view when module is selected", async ({
    page,
  }) => {
    // Mock the module coverage endpoint - use wildcard to match URL-encoded variants
    await mockModuleCoverage(
      page,
      mockQuizReadyForReview.id!,
      "1001",
      mockModuleCoverageResponse,
    )

    await page.goto(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Click on first module
    await page.getByText("Introduction and Overview").click()

    // Should navigate to module coverage view (URL may encode the module param)
    await expect(page).toHaveURL(/\/quiz\/quiz-uuid-4\/coverage\?module=/)

    // Wait for coverage view to load
    await page.waitForLoadState("networkidle")

    // Should display coverage statistics (use first() to avoid strict mode violation)
    await expect(page.getByText("50% covered").first()).toBeVisible()

    // Should display back button
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible()
  })

  test("displays sentence coverage with different levels", async ({ page }) => {
    await mockModuleCoverage(
      page,
      mockQuizReadyForReview.id!,
      "1001",
      mockModuleCoverageResponse,
    )

    // Navigate to coverage page first, then click on module
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Click on first module to show coverage view
    await page.getByText("Introduction and Overview").click()

    // Wait for coverage view to load
    await page.waitForLoadState("networkidle")

    // Should display annotated content section
    await expect(page.getByText("Annotated Content")).toBeVisible()

    // Should display sentence text
    await expect(
      page.getByText("Machine learning is a subset of artificial intelligence"),
    ).toBeVisible()
  })

  test("navigates back to module selector", async ({ page }) => {
    await mockModuleCoverage(
      page,
      mockQuizReadyForReview.id!,
      "1001",
      mockModuleCoverageResponse,
    )

    // Navigate to coverage page first, then click on module
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Click on first module to show coverage view
    await page.getByText("Introduction and Overview").click()

    // Wait for coverage view to load
    await page.waitForLoadState("networkidle")

    // Click back button
    await page.getByRole("button", { name: /back/i }).click()

    // Should navigate back to module selector
    await expect(page).toHaveURL(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Should display module selector again
    await expect(page.getByText("Select a Module")).toBeVisible()
  })

  test("shows disabled state for modules without content", async ({ page }) => {
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/coverage`)

    // Should show the module without content
    await expect(page.getByText("Empty Module")).toBeVisible()

    // Should show "needs content" message
    await expect(page.getByText(/needs.*content/i)).toBeVisible()
  })
})
