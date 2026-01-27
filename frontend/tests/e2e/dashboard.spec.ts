import { expect, test } from "@playwright/test"
import { mockUserMe, mockUserQuizzes } from "../fixtures/api-mocking"
import {
  mockEmptyQuizList,
  mockQuizGenerating,
  mockQuizList,
  mockQuizReadyForReview,
  mockUser,
} from "../mocks"

test.describe("Dashboard", () => {
  test("displays dashboard with user greeting and panels", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)

    // Navigate to dashboard
    await page.goto("/")

    // Should display user greeting
    await expect(page.getByText(`Hi, ${mockUser.name}`)).toBeVisible()

    // Should display welcome message
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Should display Create New Quiz button
    await expect(
      page.getByRole("link", { name: /create new quiz/i }),
    ).toBeVisible()

    // Should display Help and Resources section
    await expect(page.getByText(/help and resources/i)).toBeVisible()

    // Should display sidebar navigation
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Quizzes" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible()
  })

  test("shows quiz counts in review and generation panels", async ({
    page,
  }) => {
    // Set up API mocks with specific quiz data
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, [mockQuizReadyForReview, mockQuizGenerating])

    // Navigate to dashboard
    await page.goto("/")

    // Should display Quizzes Needing Review panel
    await expect(page.getByText(/quizzes needing review/i)).toBeVisible()

    // Should display Quizzes Being Generated panel
    await expect(page.getByText(/quizzes being generated/i)).toBeVisible()

    // Should show count badges (1 for review, 1 generating)
    // The counts appear as badges next to the panel titles
    const reviewPanel = page
      .locator("text=Quizzes Needing Review")
      .locator("..")
    await expect(reviewPanel.getByText("1")).toBeVisible()

    const generatingPanel = page
      .locator("text=Quizzes Being Generated")
      .locator("..")
    await expect(generatingPanel.getByText("1")).toBeVisible()
  })
})
