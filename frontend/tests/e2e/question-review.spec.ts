import { test, expect } from "@playwright/test"
import {
  mockUserMe,
  mockUserQuizzes,
  mockQuizDetail,
  mockQuizQuestions,
  mockQuizStats,
  mockBulkApprove,
  mockExportQuiz,
  mockCreateQuestion,
} from "../fixtures/api-mocking"
import {
  mockUser,
  mockQuizList,
  mockQuizReadyForReview,
  mockQuestionsList,
  mockQuizStats as mockStats,
  mockMultipleChoiceQuestion,
} from "../mocks"

test.describe("Question Review", () => {
  test("displays questions review page with quiz info", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(page, mockQuizReadyForReview.id!, mockQuizReadyForReview)
    await mockQuizQuestions(page, mockQuizReadyForReview.id!, mockQuestionsList)
    await mockQuizStats(page, mockQuizReadyForReview.id!, mockStats)

    // Navigate to questions review page
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/questions`)

    // Should display quiz title
    await expect(page.getByText(mockQuizReadyForReview.title)).toBeVisible()

    // Should display Questions tab as selected
    await expect(page.getByRole("tab", { name: "Questions" })).toBeVisible()

    // Should display Review Questions heading
    await expect(page.getByText("Review Questions")).toBeVisible()

    // Should display Add Question button
    await expect(
      page.getByRole("button", { name: /add question/i })
    ).toBeVisible()
  })

  test("shows progress bar with question stats", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(page, mockQuizReadyForReview.id!, mockQuizReadyForReview)
    await mockQuizQuestions(page, mockQuizReadyForReview.id!, mockQuestionsList)
    await mockQuizStats(page, mockQuizReadyForReview.id!, mockStats)

    // Navigate to questions review page
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/questions`)

    // Should display progress section
    await expect(page.getByText("Progress")).toBeVisible()

    // Should display stats (e.g., "5 of 10" from mockStats)
    await expect(
      page.getByText(`${mockStats.approved} of ${mockStats.total}`)
    ).toBeVisible()
  })

  test("approves all questions and exports to Canvas", async ({ page }) => {
    // Create approved questions list (all questions marked as approved)
    const approvedQuestions = mockQuestionsList.map((q) => ({
      ...q,
      is_approved: true,
    }))

    // Stats showing all questions approved
    const allApprovedStats = {
      total: mockQuestionsList.length,
      approved: mockQuestionsList.length,
    }

    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(page, mockQuizReadyForReview.id!, mockQuizReadyForReview)
    await mockQuizQuestions(page, mockQuizReadyForReview.id!, approvedQuestions)
    await mockQuizStats(page, mockQuizReadyForReview.id!, allApprovedStats)
    await mockBulkApprove(page, mockQuizReadyForReview.id!, {
      approved_count: mockQuestionsList.length,
      total_requested: mockQuestionsList.length,
    })
    await mockExportQuiz(page, mockQuizReadyForReview.id!)

    // Navigate to questions review page
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/questions`)

    // Should display "All questions reviewed" message
    await expect(page.getByText(/all.*reviewed/i)).toBeVisible()

    // Should display "Post to Canvas" export button
    const exportButton = page.getByRole("button", { name: /post to canvas/i })
    await expect(exportButton).toBeVisible()

    // Click the export button
    await exportButton.click()

    // Should show success toast message
    await expect(page.getByText(/export.*started/i)).toBeVisible()
  })

  test("creates a manual multiple choice question", async ({ page }) => {
    // Create a new question that will be returned by the create API
    const newQuestion = {
      ...mockMultipleChoiceQuestion,
      id: "new-question-uuid",
      question_data: {
        question_text: "What is the capital of France?",
        option_a: "London",
        option_b: "Paris",
        option_c: "Berlin",
        option_d: "Madrid",
        correct_answer: "B",
        explanation: null,
      },
    }

    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockQuizList)
    await mockQuizDetail(page, mockQuizReadyForReview.id!, mockQuizReadyForReview)
    await mockQuizQuestions(page, mockQuizReadyForReview.id!, mockQuestionsList)
    await mockQuizStats(page, mockQuizReadyForReview.id!, mockStats)
    await mockCreateQuestion(page, mockQuizReadyForReview.id!, newQuestion)

    // Navigate to questions review page
    await page.goto(`/quiz/${mockQuizReadyForReview.id}/questions`)

    // Click the Add Question button
    const addButton = page.getByRole("button", { name: /add question/i })
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Should show the question type selection dialog
    await expect(page.getByLabel(/select.*multiple choice/i)).toBeVisible()

    // Click on Multiple Choice option
    await page.getByLabel(/select.*multiple choice/i).click()

    // Should show the question editor form
    await expect(page.getByText("Question Text")).toBeVisible()

    // Fill out the form using locators relative to labels
    const dialog = page.locator('[role="dialog"]')
    await dialog.locator("textarea").first().fill("What is the capital of France?")
    await dialog.getByRole("textbox").nth(1).fill("London") // Option A
    await dialog.getByRole("textbox").nth(2).fill("Paris") // Option B
    await dialog.getByRole("textbox").nth(3).fill("Berlin") // Option C
    await dialog.getByRole("textbox").nth(4).fill("Madrid") // Option D

    // Select correct answer B (use force due to custom styled radio)
    await page.getByRole("radio", { name: "B" }).click({ force: true })

    // Click Save Changes button
    const saveButton = page.getByRole("button", { name: /save changes/i })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    // Should show success toast message
    await expect(page.getByText(/created/i)).toBeVisible()
  })
})
