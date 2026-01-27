import { test, expect } from "@playwright/test"
import { mockUserMe, mockUserQuizzes } from "../fixtures/api-mocking"
import { mockUser, mockEmptyQuizList } from "../mocks"

test.describe("Authentication", () => {
  test("displays login page for unauthenticated users", async ({ browser }) => {
    // Create a completely fresh context without any stored state
    const context = await browser.newContext({
      storageState: undefined,
    })
    const page = await context.newPage()

    // Navigate to login page first (doesn't require auth)
    await page.goto("/login")

    // Should stay on login page
    await expect(page).toHaveURL("/login")

    // Should display the Canvas login button
    await expect(
      page.getByRole("button", { name: /continue with canvas/i })
    ).toBeVisible()

    // Should display welcome text
    await expect(page.getByText(/welcome to quizcrafter/i)).toBeVisible()

    // Now try to access protected route without auth - should redirect to login
    await page.goto("/")
    await expect(page).toHaveURL("/login")

    await context.close()
  })

  test("redirects authenticated users from login to dashboard", async ({
    page,
  }) => {
    // Set up API mocks (page already has auth from storage state)
    await mockUserMe(page, mockUser)
    await mockUserQuizzes(page, mockEmptyQuizList)

    // Try to navigate to login page
    await page.goto("/login")

    // Should redirect to dashboard since already authenticated
    await expect(page).toHaveURL("/")

    // Should show user greeting on dashboard
    await expect(page.getByText(/hi,/i)).toBeVisible()
  })
})
