import { test as setup, expect } from "@playwright/test"
import { mockUserMe, mockUserQuizzes } from "./fixtures/api-mocking"
import { mockUser, mockEmptyQuizList } from "./mocks"

const MOCK_JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItdXVpZC0xMjM0IiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTcwNTMyMjQwMH0.mock_signature"

const AUTH_FILE = "playwright/.auth/user.json"

setup("authenticate", async ({ page }) => {
  // Mock the API endpoints using shared mock functions
  await mockUserMe(page, mockUser)
  await mockUserQuizzes(page, mockEmptyQuizList)

  // Navigate to the app and inject the mock token
  await page.goto("/")

  // Inject the mock JWT token into localStorage
  await page.evaluate((token) => {
    localStorage.setItem("access_token", token)
  }, MOCK_JWT_TOKEN)

  // Reload to apply the authentication
  await page.reload()

  // Verify we're authenticated by checking we're on the dashboard
  await expect(page).toHaveURL("/")

  // Wait for the page to be fully loaded
  await page.waitForLoadState("networkidle")

  // Save the storage state for reuse by other tests
  await page.context().storageState({ path: AUTH_FILE })
})
