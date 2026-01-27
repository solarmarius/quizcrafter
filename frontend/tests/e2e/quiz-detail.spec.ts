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
  mockQuizPublished,
  mockQuestionsList,
  mockQuizStats as mockStats,
} from "../mocks"

test.describe("Quiz Detail", () => {
  test("displays quiz information and status", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(page, mockQuizReadyForReview.id!, mockQuizReadyForReview)
    await mockQuizQuestions(page, mockQuizReadyForReview.id!, mockQuestionsList)
    await mockQuizStats(page, mockQuizReadyForReview.id!, mockStats)

    // Navigate to quiz detail page
    await page.goto(`/quiz/${mockQuizReadyForReview.id}`)

    // Should display quiz title
    await expect(page.getByText(mockQuizReadyForReview.title)).toBeVisible()

    // Should display course name
    await expect(
      page.getByText(mockQuizReadyForReview.canvas_course_name)
    ).toBeVisible()

    // Should display status indicator
    await expect(page.getByText(/ready for review/i)).toBeVisible()
  })

  test("shows appropriate actions based on quiz status", async ({ page }) => {
    // Set up API mocks for a published quiz
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(page, mockQuizPublished.id!, mockQuizPublished)
    await mockQuizQuestions(page, mockQuizPublished.id!, mockQuestionsList)
    await mockQuizStats(page, mockQuizPublished.id!, {
      total: mockQuizPublished.question_count || 0,
      approved: mockQuizPublished.question_count || 0,
    })

    // Navigate to quiz detail page
    await page.goto(`/quiz/${mockQuizPublished.id}`)

    // Should display quiz title
    await expect(page.getByText(mockQuizPublished.title)).toBeVisible()

    // Should show published status
    await expect(page.getByText(/published/i)).toBeVisible()
  })
})
