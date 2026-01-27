import { test, expect } from "@playwright/test"
import {
  mockUserMe,
  mockUserQuizzes,
  mockQuizDetail,
  mockQuizQuestions,
  mockQuizStats,
} from "../fixtures/api-mocking"
import {
  mockUser,
  mockQuizList,
  mockQuizReadyForReview,
  mockQuestionsList,
  mockQuizStats as mockStats,
} from "../mocks"

test.describe("Navigation", () => {
  test("sidebar navigation works correctly", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)

    // Start on dashboard
    await page.goto("/")
    await expect(page).toHaveURL("/")

    // Click on Quizzes link in sidebar
    await page.getByRole("link", { name: "Quizzes" }).click()
    await expect(page).toHaveURL("/quizzes")

    // Click on Settings link in sidebar
    await page.getByRole("link", { name: "Settings" }).click()
    await expect(page).toHaveURL("/settings")

    // Click on Dashboard link to go back
    await page.getByRole("link", { name: "Dashboard" }).click()
    await expect(page).toHaveURL("/")
  })

  test("tab navigation in quiz detail works correctly", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(page, mockQuizReadyForReview.id!, mockQuizReadyForReview)
    await mockQuizQuestions(page, mockQuizReadyForReview.id!, mockQuestionsList)
    await mockQuizStats(page, mockQuizReadyForReview.id!, mockStats)

    // Navigate to quiz detail page
    await page.goto(`/quiz/${mockQuizReadyForReview.id}`)

    // Should be on Quiz Information tab by default
    await expect(page.getByRole("tab", { name: "Quiz Information" })).toBeVisible()

    // Click on Questions tab
    await page.getByRole("tab", { name: "Questions" }).click()

    // Should navigate to questions page
    await expect(page).toHaveURL(`/quiz/${mockQuizReadyForReview.id}/questions`)

    // Should display Review Questions heading
    await expect(page.getByText("Review Questions")).toBeVisible()
  })
})
