import type {
  CoverageStatistics,
  ModuleCoverageResponse,
  ModuleListItem,
  ModuleListResponse,
  QuestionMapping,
  SentenceCoverage,
} from "@/client/types.gen"

// Module list for selector
export const mockCoverageModules: ModuleListItem[] = [
  {
    module_id: "1001",
    module_name: "Introduction and Overview",
    question_count: 3,
    has_content: true,
  },
  {
    module_id: "1002",
    module_name: "Machine Learning Basics",
    question_count: 2,
    has_content: true,
  },
  {
    module_id: "1003",
    module_name: "Empty Module",
    question_count: 0,
    has_content: false,
  },
]

export const mockModuleListResponse: ModuleListResponse = {
  quiz_id: "quiz-uuid-4",
  modules: mockCoverageModules,
}

// Sentence coverage data with different levels
const mockSentences: SentenceCoverage[] = [
  {
    sentence_index: 0,
    text: "Machine learning is a subset of artificial intelligence.",
    start_char: 0,
    end_char: 55,
    coverage_score: 0.85,
    coverage_level: "high",
    matched_questions: ["question-uuid-1"],
    top_question_similarity: 0.85,
  },
  {
    sentence_index: 1,
    text: "It enables systems to learn from data.",
    start_char: 56,
    end_char: 94,
    coverage_score: 0.62,
    coverage_level: "medium",
    matched_questions: ["question-uuid-2"],
    top_question_similarity: 0.62,
  },
  {
    sentence_index: 2,
    text: "This concept was introduced in the 1950s.",
    start_char: 95,
    end_char: 135,
    coverage_score: 0.35,
    coverage_level: "low",
    matched_questions: [],
  },
  {
    sentence_index: 3,
    text: "Various algorithms exist for different purposes.",
    start_char: 136,
    end_char: 183,
    coverage_score: 0.15,
    coverage_level: "none",
    matched_questions: [],
  },
]

const mockStatistics: CoverageStatistics = {
  total_sentences: 4,
  covered_sentences: 2,
  coverage_percentage: 50,
  total_questions: 3,
  largest_gap_sentences: 2,
}

const mockQuestionMappings: QuestionMapping[] = [
  {
    question_id: "question-uuid-1",
    question_text: "What is machine learning?",
    question_type: "multiple_choice",
    best_matching_sentences: [0],
    best_similarity_score: 0.85,
  },
  {
    question_id: "question-uuid-2",
    question_text: "How do systems learn from data?",
    question_type: "multiple_choice",
    best_matching_sentences: [1],
    best_similarity_score: 0.62,
  },
]

export const mockModuleCoverageResponse: ModuleCoverageResponse = {
  quiz_id: "quiz-uuid-4",
  module: {
    module_id: "1001",
    module_name: "Introduction and Overview",
    pages: [
      {
        title: "Introduction to ML",
        sentences: mockSentences,
        word_count: 45,
        coverage_summary: {
          high: 1,
          medium: 1,
          low: 1,
          none: 1,
        },
      },
    ],
    overall_coverage_percentage: 50,
    total_sentences: 4,
    covered_sentences: 2,
    gap_count: 1,
  },
  question_mappings: mockQuestionMappings,
  statistics: mockStatistics,
  computed_at: "2024-01-15T12:00:00Z",
}
