"""Pydantic schemas for coverage analysis API."""

from uuid import UUID

from pydantic import BaseModel, Field


class SentenceCoverage(BaseModel):
    """Coverage data for a single sentence."""

    sentence_index: int = Field(description="Index of sentence within the page")
    text: str = Field(description="The sentence text")
    start_char: int = Field(description="Start character position in original content")
    end_char: int = Field(description="End character position in original content")
    coverage_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Similarity score (0=no match, 1=perfect match)",
    )
    coverage_level: str = Field(
        description="Coverage level: 'none', 'low', 'medium', 'high'"
    )
    matched_questions: list[UUID] = Field(
        default_factory=list,
        description="IDs of questions that match this sentence",
    )
    top_question_similarity: float | None = Field(
        default=None,
        description="Highest similarity score among matched questions",
    )


class AnnotatedPage(BaseModel):
    """A single page/item within a module with coverage annotations."""

    title: str = Field(description="Page or document title")
    sentences: list[SentenceCoverage] = Field(
        description="Annotated sentences with coverage data"
    )
    word_count: int = Field(description="Total word count of the page")
    coverage_summary: dict[str, int] = Field(
        description="Count of sentences by coverage level",
        examples=[{"none": 5, "low": 3, "medium": 8, "high": 4}],
    )


class ModuleCoverage(BaseModel):
    """Coverage data for an entire module."""

    module_id: str = Field(description="Module identifier")
    module_name: str = Field(description="Human-readable module name")
    pages: list[AnnotatedPage] = Field(description="Annotated pages in the module")
    overall_coverage_percentage: float = Field(
        ge=0.0,
        le=100.0,
        description="Percentage of sentences with coverage above threshold",
    )
    total_sentences: int = Field(description="Total number of sentences analyzed")
    covered_sentences: int = Field(
        description="Number of sentences with coverage above threshold"
    )
    gap_count: int = Field(
        description="Number of consecutive uncovered sentence groups"
    )


class QuestionMapping(BaseModel):
    """Maps a question to its best matching content."""

    question_id: UUID = Field(description="Question UUID")
    question_text: str = Field(
        max_length=300,
        description="Truncated question text for display",
    )
    best_matching_sentences: list[int] = Field(
        description="Indices of best matching sentences"
    )
    best_similarity_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Highest similarity score to any sentence",
    )


class CoverageStatistics(BaseModel):
    """Overall coverage statistics for a module."""

    total_sentences: int = Field(description="Total sentences in content")
    covered_sentences: int = Field(description="Sentences with coverage >= threshold")
    coverage_percentage: float = Field(
        ge=0.0,
        le=100.0,
        description="Percentage of sentences covered",
    )
    total_questions: int = Field(description="Total questions analyzed")
    largest_gap_sentences: int = Field(
        description="Longest consecutive uncovered stretch"
    )


class ModuleCoverageResponse(BaseModel):
    """Response for single module coverage analysis."""

    quiz_id: UUID = Field(description="Quiz UUID")
    module: ModuleCoverage = Field(description="Coverage data for the module")
    question_mappings: list[QuestionMapping] = Field(
        description="Question-to-content mappings"
    )
    statistics: CoverageStatistics = Field(description="Summary statistics")
    computed_at: str = Field(description="ISO timestamp when coverage was computed")


class ModuleListItem(BaseModel):
    """Summary of a module available for coverage analysis."""

    module_id: str = Field(description="Module identifier")
    module_name: str = Field(description="Human-readable module name")
    question_count: int = Field(
        description="Number of questions generated from this module"
    )
    has_content: bool = Field(
        description="Whether extracted content exists for this module"
    )


class ModuleListResponse(BaseModel):
    """Response listing modules available for coverage analysis."""

    quiz_id: UUID = Field(description="Quiz UUID")
    modules: list[ModuleListItem] = Field(
        description="Modules available for coverage analysis"
    )
