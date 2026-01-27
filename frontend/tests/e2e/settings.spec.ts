import { test, expect } from "@playwright/test"
import { mockUserMe, mockUserQuizzes } from "../fixtures/api-mocking"
import { mockUser, mockEmptyQuizList } from "../mocks"

test.describe("Settings", () => {
  test("displays user settings with profile information", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)

    // Navigate to settings page
    await page.goto("/settings")

    // Should display Settings heading or user profile section
    await expect(page.getByText(/settings/i).first()).toBeVisible()

    // Should display user name somewhere on the page
    await expect(page.getByText(mockUser.name)).toBeVisible()
  })

  test("switches to Norwegian language", async ({ page }) => {
    // Set up API mocks
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)

    // Navigate to settings page
    await page.goto("/settings")

    // Click on Norsk language card option
    await page.getByTestId("language-option-no").click()

    // Should display Norwegian heading for User Settings
    await expect(page.getByText("Brukerinnstillinger")).toBeVisible()
  })
})
