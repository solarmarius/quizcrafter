import { expect, test } from "@playwright/test"
import { mockUserMe, mockUserQuizzes } from "../fixtures/api-mocking"
import {
  mockEmptyQuizList,
  mockQuizList,
  mockQuizReadyForReview,
  mockUser,
} from "../mocks"

test.describe("Quiz List", () => {
  test("displays list of quizzes with status indicators", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)

    // Navigate to quiz list page
    await page.goto("/quizzes")

    // Should display page title
    await expect(page.getByText("My Quizzes")).toBeVisible()

    // Should display quiz table with headers
    const table = page.locator("table")
    await expect(table.getByText("Quiz Title")).toBeVisible()
    await expect(table.getByText("Course")).toBeVisible()
    await expect(table.getByText("Status")).toBeVisible()

    // Should display quiz titles from mock data
    await expect(page.getByText(mockQuizReadyForReview.title)).toBeVisible()

    // Should display course names (use first() since multiple quizzes have same course)
    await expect(
      page.getByText(mockQuizReadyForReview.canvas_course_name).first(),
    ).toBeVisible()
  })

  test("shows empty state when no quizzes exist", async ({ page }) => {
    // Set up API mocks with empty quiz list
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)

    // Navigate to quiz list page
    await page.goto("/quizzes")

    // Should display empty state message
    await expect(page.getByText(/no quizzes/i)).toBeVisible()

    // Should display create quiz link in the empty state
    await expect(
      page.getByRole("link", { name: "Create Your First Quiz" }),
    ).toBeVisible()
  })
})
