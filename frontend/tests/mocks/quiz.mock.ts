import type { Quiz, QuizStatus } from "@/client/types.gen"

const baseQuiz: Quiz = {
  id: "quiz-uuid-1",
  owner_id: "test-user-uuid-1234",
  canvas_course_id: 12345,
  canvas_course_name: "Introduction to AI",
  title: "AI Fundamentals Quiz",
  question_count: 0,
  language: "en",
  tone: "academic",
  status: "created" as QuizStatus,
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  selected_modules: {
    "1001": {
      name: "Machine Learning Basics",
      question_batches: [
        { question_type: "multiple_choice", count: 10, difficulty: "medium" },
      ],
    },
  },
}

export const mockQuizCreated: Quiz = {
  ...baseQuiz,
  status: "created",
}

export const mockQuizExtracting: Quiz = {
  ...baseQuiz,
  id: "quiz-uuid-2",
  status: "extracting_content",
}

export const mockQuizGenerating: Quiz = {
  ...baseQuiz,
  id: "quiz-uuid-3",
  title: "Machine Learning Quiz",
  status: "generating_questions",
}

export const mockQuizReadyForReview: Quiz = {
  ...baseQuiz,
  id: "quiz-uuid-4",
  title: "Data Science Quiz",
  status: "ready_for_review",
  question_count: 10,
}

export const mockQuizPublished: Quiz = {
  ...baseQuiz,
  id: "quiz-uuid-5",
  title: "Deep Learning Quiz",
  status: "published",
  question_count: 15,
  canvas_quiz_id: "canvas-quiz-123",
  exported_at: "2024-01-16T12:00:00Z",
}

export const mockQuizFailed: Quiz = {
  ...baseQuiz,
  id: "quiz-uuid-6",
  title: "Failed Quiz",
  status: "failed",
  failure_reason: "llm_generation_error",
}

export const mockQuizList: Quiz[] = [
  mockQuizReadyForReview,
  mockQuizGenerating,
  mockQuizPublished,
]

export const mockEmptyQuizList: Quiz[] = []

export const mockQuizStats = {
  total: 10,
  approved: 5,
  pending: 5,
}
