import type { Page } from "@playwright/test"
import type {
  UserPublic,
  Quiz,
  QuestionResponse,
  CanvasCourse,
  CanvasModule,
  BulkOperationResponse,
  ManualModuleResponse,
} from "@/client/types.gen"

// API routes don't have a prefix - they're at the root level
// The BASE URL is http://localhost:8000
// Use explicit host pattern for reliable matching
const API_BASE = "**/localhost:8000"

/**
 * Mock GET /users/me endpoint
 */
export async function mockUserMe(page: Page, user: UserPublic) {
  await page.route(`${API_BASE}/users/me`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(user),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock GET /quiz/ endpoint (user quizzes)
 */
export async function mockUserQuizzes(page: Page, quizzes: Quiz[]) {
  await page.route(`${API_BASE}/quiz/`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(quizzes),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock GET /quiz/{id} endpoint
 */
export async function mockQuizDetail(page: Page, quizId: string, quiz: Quiz) {
  await page.route(`${API_BASE}/quiz/${quizId}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(quiz),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock GET /questions/{quiz_id} endpoint
 * Uses wildcard to match any query parameters
 */
export async function mockQuizQuestions(
  page: Page,
  quizId: string,
  questions: QuestionResponse[]
) {
  // Match with or without query parameters
  await page.route(`${API_BASE}/questions/${quizId}**`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(questions),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock GET /quiz/{id}/questions/stats endpoint
 */
export async function mockQuizStats(
  page: Page,
  quizId: string,
  stats: { total: number; approved: number; pending?: number }
) {
  await page.route(`${API_BASE}/quiz/${quizId}/questions/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stats),
    })
  })
}

/**
 * Mock GET /canvas/courses endpoint
 */
export async function mockCanvasCourses(page: Page, courses: CanvasCourse[]) {
  await page.route(`${API_BASE}/canvas/courses`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(courses),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock GET /canvas/courses/{id}/modules endpoint
 */
export async function mockCanvasModules(
  page: Page,
  courseId: number,
  modules: CanvasModule[]
) {
  await page.route(
    `${API_BASE}/canvas/courses/${courseId}/modules`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(modules),
      })
    }
  )
}

/**
 * Mock POST /quiz/ endpoint (create quiz)
 */
export async function mockCreateQuiz(page: Page, responseQuiz: Quiz) {
  await page.route(`${API_BASE}/quiz/`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(responseQuiz),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock PUT /questions/{quiz_id}/{question_id}/approve endpoint
 */
export async function mockApproveQuestion(
  page: Page,
  quizId: string,
  approvedQuestion: QuestionResponse
) {
  await page.route(
    `${API_BASE}/questions/${quizId}/*/approve`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...approvedQuestion, is_approved: true }),
      })
    }
  )
}

/**
 * Mock DELETE /questions/{quiz_id}/{question_id} endpoint
 */
export async function mockDeleteQuestion(page: Page, quizId: string) {
  await page.route(`${API_BASE}/questions/${quizId}/*`, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Question deleted successfully" }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock PUT /questions/{quiz_id}/bulk-approve endpoint
 */
export async function mockBulkApprove(
  page: Page,
  quizId: string,
  response: BulkOperationResponse
) {
  await page.route(
    `${API_BASE}/questions/${quizId}/bulk-approve`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      })
    }
  )
}

/**
 * Mock POST /quiz/{id}/export endpoint
 */
export async function mockExportQuiz(page: Page, quizId: string) {
  await page.route(`${API_BASE}/quiz/${quizId}/export`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Quiz exported successfully",
        canvas_quiz_id: "canvas-123",
      }),
    })
  })
}

/**
 * Mock POST /questions/{quiz_id} endpoint (create question)
 */
export async function mockCreateQuestion(
  page: Page,
  quizId: string,
  responseQuestion: QuestionResponse
) {
  await page.route(`${API_BASE}/questions/${quizId}`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(responseQuestion),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock DELETE /auth/logout endpoint
 */
export async function mockLogout(page: Page) {
  await page.route(`${API_BASE}/auth/logout`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Logged out successfully" }),
    })
  })
}

/**
 * Mock POST /quiz/{id}/extract-content endpoint
 */
export async function mockExtractContent(page: Page, quizId: string) {
  await page.route(
    `${API_BASE}/quiz/${quizId}/extract-content`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Content extraction started" }),
      })
    }
  )
}

/**
 * Mock POST /quiz/{id}/generate-questions endpoint
 */
export async function mockGenerateQuestions(page: Page, quizId: string) {
  await page.route(
    `${API_BASE}/quiz/${quizId}/generate-questions`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Question generation started" }),
      })
    }
  )
}

/**
 * Mock POST /quiz/manual-modules/upload endpoint
 */
export async function mockUploadManualModule(
  page: Page,
  response: ManualModuleResponse
) {
  await page.route(`${API_BASE}/quiz/manual-modules/upload`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Configuration for mockAllApis
 */
export interface MockConfig {
  user: UserPublic
  quizzes?: Quiz[]
  quiz?: Quiz
  questions?: QuestionResponse[]
  courses?: CanvasCourse[]
  modules?: CanvasModule[]
}

/**
 * Convenience function to mock all common APIs at once
 */
export async function mockAllApis(page: Page, config: MockConfig) {
  await mockUserMe(page, config.user)

  if (config.quizzes) {
    await mockUserQuizzes(page, config.quizzes)
  }

  if (config.quiz) {
    await mockQuizDetail(page, config.quiz.id!, config.quiz)
    await mockQuizStats(page, config.quiz.id!, {
      total: config.quiz.question_count || 0,
      approved: 0,
    })
  }

  if (config.questions && config.quiz) {
    await mockQuizQuestions(page, config.quiz.id!, config.questions)
  }

  if (config.courses) {
    await mockCanvasCourses(page, config.courses)
  }

  if (config.modules && config.courses && config.courses.length > 0) {
    for (const course of config.courses) {
      await mockCanvasModules(page, course.id, config.modules)
    }
  }

  await mockLogout(page)
}
