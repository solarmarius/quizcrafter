import type { QuestionResponse } from "@/client/types.gen"

export const mockMultipleChoiceQuestion: QuestionResponse = {
  id: "question-uuid-1",
  quiz_id: "quiz-uuid-4",
  question_type: "multiple_choice",
  difficulty: "medium",
  is_approved: false,
  question_data: {
    question_text: "What is the primary purpose of a neural network?",
    answers: [
      { text: "To process data in layers", is_correct: true },
      { text: "To store data permanently", is_correct: false },
      { text: "To display graphics", is_correct: false },
      { text: "To manage databases", is_correct: false },
    ],
  },
  created_at: "2024-01-15T11:00:00Z",
  module_id: "1001",
}

export const mockApprovedQuestion: QuestionResponse = {
  id: "question-uuid-2",
  quiz_id: "quiz-uuid-4",
  question_type: "multiple_choice",
  difficulty: "easy",
  is_approved: true,
  approved_at: "2024-01-15T12:00:00Z",
  question_data: {
    question_text: "Which of the following is a type of machine learning?",
    answers: [
      { text: "Supervised learning", is_correct: true },
      { text: "Manual learning", is_correct: false },
      { text: "Static learning", is_correct: false },
      { text: "Random learning", is_correct: false },
    ],
  },
  created_at: "2024-01-15T11:00:00Z",
  module_id: "1001",
}

export const mockTrueFalseQuestion: QuestionResponse = {
  id: "question-uuid-3",
  quiz_id: "quiz-uuid-4",
  question_type: "true_false",
  difficulty: "easy",
  is_approved: false,
  question_data: {
    question_text: "Machine learning requires large datasets to function.",
    correct_answer: true,
  },
  created_at: "2024-01-15T11:00:00Z",
  module_id: "1001",
}

export const mockQuestionsList: QuestionResponse[] = [
  mockMultipleChoiceQuestion,
  mockApprovedQuestion,
  mockTrueFalseQuestion,
  {
    ...mockMultipleChoiceQuestion,
    id: "question-uuid-4",
    question_data: {
      question_text: "What is backpropagation used for?",
      answers: [
        { text: "Training neural networks", is_correct: true },
        { text: "Data storage", is_correct: false },
        { text: "User authentication", is_correct: false },
        { text: "File compression", is_correct: false },
      ],
    },
  },
  {
    ...mockMultipleChoiceQuestion,
    id: "question-uuid-5",
    difficulty: "hard",
    question_data: {
      question_text:
        "Which activation function helps with the vanishing gradient problem?",
      answers: [
        { text: "ReLU", is_correct: true },
        { text: "Sigmoid", is_correct: false },
        { text: "Tanh", is_correct: false },
        { text: "Linear", is_correct: false },
      ],
    },
  },
]

export const mockEmptyQuestionsList: QuestionResponse[] = []
