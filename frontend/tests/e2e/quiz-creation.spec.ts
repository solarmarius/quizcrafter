import { test, expect } from "@playwright/test"
import {
  mockUserMe,
  mockUserQuizzes,
  mockCanvasCourses,
  mockCanvasModules,
  mockCreateQuiz,
  mockQuizDetail,
  mockQuizQuestions,
  mockQuizStats,
  mockUploadManualModule,
} from "../fixtures/api-mocking"
import {
  mockUser,
  mockEmptyQuizList,
  mockCourses,
  mockModules,
  mockQuizCreated,
} from "../mocks"

test.describe("Quiz Creation", () => {
  test("completes full quiz creation flow and navigates to quiz page", async ({
    page,
  }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)
    await mockCanvasCourses(page, mockCourses)
    await mockCreateQuiz(page, mockQuizCreated)
    await mockQuizDetail(page, mockQuizCreated.id!, mockQuizCreated)
    await mockQuizQuestions(page, mockQuizCreated.id!, [])
    await mockQuizStats(page, mockQuizCreated.id!, { total: 0, approved: 0 })

    // Mock modules for all courses
    for (const course of mockCourses) {
      await mockCanvasModules(page, course.id, mockModules)
    }

    // Navigate to create quiz page
    await page.goto("/create-quiz")

    // Step 1: Course Selection
    await expect(page.getByText("Create New Quiz")).toBeVisible()
    await expect(page.getByText(/step 1 of 4/i)).toBeVisible()
    await expect(page.getByText(/select course/i)).toBeVisible()

    // Should display courses list
    await expect(page.getByText(mockCourses[0].name)).toBeVisible()

    // Select first course
    await page.getByText(mockCourses[0].name).click()

    // Next button should be enabled
    const nextButton = page.getByRole("button", { name: "Next" })
    await expect(nextButton).toBeEnabled()

    // Click next to go to step 2
    await nextButton.click()

    // Step 2: Module Selection
    await expect(page.getByText(/step 2 of 4/i)).toBeVisible()

    // Should display modules list
    await expect(page.getByText(mockModules[0].name)).toBeVisible()

    // Select first module
    await page.getByText(mockModules[0].name).click()

    // Click next to go to step 3
    await nextButton.click()

    // Step 3: Question Configuration
    await expect(page.getByText(/step 3 of 4/i)).toBeVisible()

    // Should display the selected module with question batch options
    await expect(page.getByText(mockModules[0].name)).toBeVisible()

    // Add a question batch for the module (required for validation)
    const addBatchButton = page.getByRole("button", { name: /add batch/i })
    await expect(addBatchButton).toBeVisible()
    await addBatchButton.click()

    // Now the Next button should be enabled
    await expect(nextButton).toBeEnabled()
    await nextButton.click()

    // Step 4: Quiz Settings
    await expect(page.getByText(/step 4 of 4/i)).toBeVisible()

    // Should display language selection
    await expect(page.getByText(/language/i).first()).toBeVisible()

    // Should display tone selection
    await expect(page.getByText(/tone/i).first()).toBeVisible()

    // Click Create Quiz button
    const createButton = page.getByRole("button", { name: /create quiz/i })
    await expect(createButton).toBeVisible()
    await createButton.click()

    // Should navigate to quiz detail page
    await expect(page).toHaveURL(`/quiz/${mockQuizCreated.id}`)

    // Should display the quiz title on the detail page
    await expect(page.getByText(mockQuizCreated.title)).toBeVisible()
  })

  test("shows cancel button that returns to quiz list", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)
    await mockCanvasCourses(page, mockCourses)

    // Navigate to create quiz page
    await page.goto("/create-quiz")

    // Should display cancel button
    const cancelButton = page.getByRole("button", { name: "Cancel" })
    await expect(cancelButton).toBeVisible()

    // Click cancel
    await cancelButton.click()

    // Should navigate back to quizzes page or dashboard
    await expect(page).toHaveURL(/\/(quizzes)?$/)
  })

  test("creates a manual module with text content", async ({ page }) => {
    const manualModuleName = "My Custom Module"
    const manualModuleContent =
      "This is a comprehensive test content for the manual module creation feature. " +
      "It contains detailed information about various topics that will be used to generate quiz questions. " +
      "The content covers multiple aspects of the subject matter, including theoretical concepts, " +
      "practical applications, and real-world examples. This ensures that the generated questions " +
      "will be diverse and cover different difficulty levels. The module also includes information " +
      "about best practices, common pitfalls, and advanced techniques that students should be aware of. " +
      "By providing such comprehensive content, we can ensure high-quality question generation. " +
      "This text needs to be at least 500 characters long to meet the minimum requirements for processing."

    const mockManualModuleResponse = {
      module_id: "manual-module-uuid-123",
      name: manualModuleName,
      content_preview: manualModuleContent.substring(0, 200) + "...",
      full_content: manualModuleContent,
      word_count: manualModuleContent.split(/\s+/).length,
    }

    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)
    await mockCanvasCourses(page, mockCourses)
    await mockUploadManualModule(page, mockManualModuleResponse)

    // Mock modules for all courses
    for (const course of mockCourses) {
      await mockCanvasModules(page, course.id, mockModules)
    }

    // Navigate to create quiz page
    await page.goto("/create-quiz")

    // Step 1: Select a course
    await page.getByText(mockCourses[0].name).click()
    await page.getByRole("button", { name: "Next" }).click()

    // Step 2: Module Selection - Click "Add Module" button
    await expect(page.getByText(/step 2 of 4/i)).toBeVisible()
    const addModuleButton = page.getByRole("button", { name: "Add Module" })
    await expect(addModuleButton).toBeVisible()
    await addModuleButton.click()

    // Dialog should open - click "Enter Text Content" option
    const enterTextButton = page.getByRole("button", {
      name: /enter text content/i,
    })
    await expect(enterTextButton).toBeVisible()
    await enterTextButton.click()

    // Fill in the module name
    const dialog = page.locator('[role="dialog"]')
    const moduleNameInput = dialog.locator("input").first()
    await expect(moduleNameInput).toBeVisible()
    await moduleNameInput.fill(manualModuleName)

    // Fill in the text content (500+ chars)
    const textContentArea = dialog.locator("textarea")
    await expect(textContentArea).toBeVisible()
    await textContentArea.fill(manualModuleContent)

    // Click "Process Content" button
    const processButton = page.getByRole("button", { name: /process content/i })
    await expect(processButton).toBeEnabled()
    await processButton.click()

    // Should show Content Preview with part of the entered text
    await expect(page.getByText("Content Preview")).toBeVisible()
    // Verify content preview contains beginning of the text
    await expect(
      page.getByText(/This is a comprehensive test content/i)
    ).toBeVisible()

    // Click "Add Module" to confirm
    const confirmButton = dialog.getByRole("button", { name: "Add Module" })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Dialog should close and module should appear in the list
    await expect(dialog).not.toBeVisible()

    // Verify the manual module card appears with the module name
    const manualModuleCard = page.getByTestId(
      `manual-module-card-${mockManualModuleResponse.module_id}`
    )
    await expect(manualModuleCard).toBeVisible()
    await expect(manualModuleCard.getByText(manualModuleName)).toBeVisible()

    // Verify it shows the "Manual" badge within the card
    await expect(manualModuleCard.getByText("Manual")).toBeVisible()
  })

  test("creates quiz with custom LLM instructions", async ({ page }) => {
    const customInstructions =
      "Focus on practical applications and real-world scenarios. Avoid theoretical questions."

    // Create a quiz with custom instructions for the mock response
    const quizWithInstructions = {
      ...mockQuizCreated,
      custom_instructions: customInstructions,
    }

    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)
    await mockCanvasCourses(page, mockCourses)
    await mockCreateQuiz(page, quizWithInstructions)
    await mockQuizDetail(page, quizWithInstructions.id!, quizWithInstructions)
    await mockQuizQuestions(page, quizWithInstructions.id!, [])
    await mockQuizStats(page, quizWithInstructions.id!, { total: 0, approved: 0 })

    // Mock modules for all courses
    for (const course of mockCourses) {
      await mockCanvasModules(page, course.id, mockModules)
    }

    // Navigate to create quiz page
    await page.goto("/create-quiz")

    // Step 1: Select a course
    await page.getByText(mockCourses[0].name).click()
    await page.getByRole("button", { name: "Next" }).click()

    // Step 2: Select a module
    await page.getByText(mockModules[0].name).click()
    await page.getByRole("button", { name: "Next" }).click()

    // Step 3: Add a batch
    await page.getByRole("button", { name: /add batch/i }).click()
    await page.getByRole("button", { name: "Next" }).click()

    // Step 4: Quiz Settings - Click on Advanced tab
    await expect(page.getByText(/step 4 of 4/i)).toBeVisible()
    const advancedTab = page.getByRole("tab", { name: /advanced/i })
    await expect(advancedTab).toBeVisible()
    await advancedTab.click()

    // Fill in custom instructions (placeholder starts with "e.g.,")
    const instructionsTextarea = page.getByPlaceholder(/e\.g\.,.*include/i)
    await expect(instructionsTextarea).toBeVisible()
    await instructionsTextarea.fill(customInstructions)

    // Click Create Quiz button
    const createButton = page.getByRole("button", { name: /create quiz/i })
    await expect(createButton).toBeVisible()
    await createButton.click()

    // Should navigate to quiz detail page
    await expect(page).toHaveURL(`/quiz/${quizWithInstructions.id}`)

    // Verify custom instructions are displayed on the quiz detail page
    await expect(page.getByText("Custom Instructions")).toBeVisible()
    await expect(page.getByText(customInstructions)).toBeVisible()
  })
})
