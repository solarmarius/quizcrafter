import { expect, test } from "@playwright/test"

test.describe("Language Switching", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.addInitScript(() => {
      window.localStorage.removeItem("quizcrafter_ui_language")
    })
  })

  test("should default to English", async ({ page }) => {
    await page.goto("/")
    // Default should be English
    const dashboardLink = page.locator('a[href="/"]').nth(1)
    await expect(dashboardLink).toContainText("Dashboard")
  })

  test("should switch language to Norwegian in settings", async ({ page }) => {
    await page.goto("/settings")
    await expect(page).toHaveURL("/settings")

    // Click on Norwegian language option
    await page.click('[data-testid="language-option-no"]')

    // Verify sidebar updates to Norwegian
    const dashboardLink = page.locator('a[href="/"]').nth(1)
    await expect(dashboardLink).toContainText("Oversikt")

    const quizzesLink = page.locator('a[href="/quizzes"]')
    await expect(quizzesLink).toContainText("Quizer")

    const settingsLink = page.locator('a[href="/settings"]')
    await expect(settingsLink).toContainText("Innstillinger")
  })

  test("should persist language preference after reload", async ({ page }) => {
    await page.goto("/settings")

    // Switch to Norwegian
    await page.click('[data-testid="language-option-no"]')

    // Verify Norwegian is active
    const dashboardLink = page.locator('a[href="/"]').nth(1)
    await expect(dashboardLink).toContainText("Oversikt")

    // Reload the page
    await page.reload()

    // Verify Norwegian is still active after reload
    await expect(dashboardLink).toContainText("Oversikt")
  })

  test("should switch back to English", async ({ page }) => {
    await page.goto("/settings")

    // First switch to Norwegian
    await page.click('[data-testid="language-option-no"]')
    const dashboardLink = page.locator('a[href="/"]').nth(1)
    await expect(dashboardLink).toContainText("Oversikt")

    // Switch back to English
    await page.click('[data-testid="language-option-en"]')

    // Verify English is active
    await expect(dashboardLink).toContainText("Dashboard")
  })

  test("should translate settings page title", async ({ page }) => {
    await page.goto("/settings")

    // Verify English title
    await expect(page.locator("text=User Settings")).toBeVisible()

    // Switch to Norwegian
    await page.click('[data-testid="language-option-no"]')

    // Verify Norwegian title
    await expect(page.locator("text=Brukerinnstillinger")).toBeVisible()
  })

  test("should translate dashboard content", async ({ page }) => {
    await page.goto("/settings")

    // Switch to Norwegian
    await page.click('[data-testid="language-option-no"]')

    // Go to dashboard
    await page.click('a[href="/"]')
    await expect(page).toHaveURL("/")

    // Check for Norwegian dashboard content
    await expect(page.locator("text=Quizer under generering")).toBeVisible()
    await expect(
      page.locator("text=Quizer som trenger gjennomgang"),
    ).toBeVisible()
    await expect(page.locator("text=Hjelp og ressurser")).toBeVisible()
  })

  test("should store language preference in localStorage", async ({ page }) => {
    await page.goto("/settings")

    // Switch to Norwegian
    await page.click('[data-testid="language-option-no"]')

    // Check localStorage
    const storedLanguage = await page.evaluate(() =>
      window.localStorage.getItem("quizcrafter_ui_language"),
    )
    expect(storedLanguage).toBe("no")
  })

  test("should translate quizzes page", async ({ page }) => {
    await page.goto("/settings")

    // Switch to Norwegian
    await page.click('[data-testid="language-option-no"]')

    // Navigate to quizzes page
    await page.click('a[href="/quizzes"]')
    await expect(page).toHaveURL("/quizzes")

    // Verify Norwegian content
    await expect(page.locator("text=Mine quizer")).toBeVisible()
  })
})
