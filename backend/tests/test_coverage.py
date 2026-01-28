"""Tests for the coverage analysis module."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import numpy as np  # type: ignore[import-not-found]
import pytest

from src.coverage.embedding import compute_similarity_matrix, generate_embeddings
from src.coverage.schemas import (
    AnnotatedPage,
    CoverageStatistics,
    ModuleCoverage,
    ModuleCoverageResponse,
    ModuleListItem,
    ModuleListResponse,
    QuestionMapping,
    SentenceCoverage,
)
from src.coverage.service import (
    COVERAGE_THRESHOLDS,
    _count_coverage_gaps,
    compute_module_coverage,
    get_modules_for_coverage,
)
from src.coverage.tokenizer import SentenceSpan, split_into_sentences


class TestTokenizer:
    """Tests for sentence tokenization."""

    def test_split_empty_text(self):
        """Should return empty list for empty text."""
        result = split_into_sentences("")
        assert result == []

    def test_split_short_text(self):
        """Should return empty list for text shorter than min_length."""
        result = split_into_sentences("Hi!", min_length=10)
        assert result == []

    def test_split_single_sentence(self):
        """Should correctly split a single sentence."""
        text = "This is a single sentence about programming."
        result = split_into_sentences(text)
        assert len(result) == 1
        assert result[0].text == "This is a single sentence about programming."
        assert result[0].index == 0

    def test_split_multiple_sentences(self):
        """Should correctly split multiple sentences."""
        text = "First sentence here. Second sentence follows. Third one too."
        result = split_into_sentences(text)
        assert len(result) == 3
        assert result[0].text == "First sentence here."
        assert result[1].text == "Second sentence follows."
        assert result[2].text == "Third one too."

    def test_split_filters_short_sentences(self):
        """Should filter out sentences shorter than min_length."""
        text = "OK. This is a longer sentence that should be kept. Yes."
        result = split_into_sentences(text, min_length=15)
        assert len(result) == 1
        assert "longer sentence" in result[0].text

    def test_sentence_span_positions(self):
        """Should track correct start/end positions."""
        text = "First sentence. Second sentence."
        result = split_into_sentences(text)
        assert len(result) == 2
        # Verify positions make sense (start < end, end >= start + len(text))
        for span in result:
            assert span.start < span.end
            assert span.end - span.start >= len(span.text.strip())

    def test_sentence_span_indices(self):
        """Should assign sequential indices."""
        text = "One. Two. Three. Four. Five."
        result = split_into_sentences(text, min_length=3)
        indices = [s.index for s in result]
        assert indices == list(range(len(result)))


class TestEmbedding:
    """Tests for embedding generation and similarity computation."""

    @patch("src.coverage.embedding.get_embedding_client")
    def test_generate_embeddings_empty_list(self, mock_client):
        """Should return empty array for empty input."""
        result = generate_embeddings([])
        assert result.shape[0] == 0
        mock_client.assert_not_called()

    @patch("src.coverage.embedding.get_embedding_client")
    def test_generate_embeddings_single_text(self, mock_client):
        """Should generate embeddings for a single text."""
        # Mock the response
        mock_embedding = MagicMock()
        mock_embedding.embedding = [0.1] * 3072
        mock_response = MagicMock()
        mock_response.data = [mock_embedding]
        mock_client.return_value.embeddings.create.return_value = mock_response

        result = generate_embeddings(["Test text"])

        assert result.shape == (1, 3072)
        mock_client.return_value.embeddings.create.assert_called_once()

    @patch("src.coverage.embedding.get_embedding_client")
    def test_generate_embeddings_normalizes_output(self, mock_client):
        """Should L2-normalize the output embeddings."""
        # Create a non-normalized embedding
        raw_embedding = [1.0, 2.0, 3.0] + [0.0] * 3069
        mock_embedding = MagicMock()
        mock_embedding.embedding = raw_embedding
        mock_response = MagicMock()
        mock_response.data = [mock_embedding]
        mock_client.return_value.embeddings.create.return_value = mock_response

        result = generate_embeddings(["Test text"])

        # Check that the result is normalized (L2 norm should be ~1)
        norm = np.linalg.norm(result[0])
        assert abs(norm - 1.0) < 0.001

    def test_compute_similarity_matrix_empty(self):
        """Should return empty array for empty inputs."""
        content = np.array([])
        questions = np.array([])
        result = compute_similarity_matrix(content, questions)
        assert result.size == 0

    def test_compute_similarity_matrix_identical_vectors(self):
        """Should return 1.0 for identical normalized vectors."""
        # Create identical normalized vectors
        vec = np.array([[1.0, 0.0, 0.0]], dtype=np.float32)
        result = compute_similarity_matrix(vec, vec)
        assert result.shape == (1, 1)
        assert abs(result[0, 0] - 1.0) < 0.001

    def test_compute_similarity_matrix_orthogonal_vectors(self):
        """Should return 0.0 for orthogonal vectors."""
        vec1 = np.array([[1.0, 0.0, 0.0]], dtype=np.float32)
        vec2 = np.array([[0.0, 1.0, 0.0]], dtype=np.float32)
        result = compute_similarity_matrix(vec1, vec2)
        assert result.shape == (1, 1)
        assert abs(result[0, 0]) < 0.001

    def test_compute_similarity_matrix_dimensions(self):
        """Should return correct dimensions."""
        content = np.random.randn(5, 128).astype(np.float32)
        questions = np.random.randn(3, 128).astype(np.float32)
        result = compute_similarity_matrix(content, questions)
        assert result.shape == (5, 3)


class TestSchemas:
    """Tests for Pydantic schemas."""

    def test_sentence_coverage_validation(self):
        """Should validate SentenceCoverage correctly."""
        sentence = SentenceCoverage(
            sentence_index=0,
            text="Test sentence",
            start_char=0,
            end_char=13,
            coverage_score=0.75,
            coverage_level="high",
            matched_questions=[uuid.uuid4()],
            top_question_similarity=0.75,
        )
        assert sentence.coverage_score == 0.75
        assert sentence.coverage_level == "high"

    def test_module_list_item(self):
        """Should create ModuleListItem correctly."""
        item = ModuleListItem(
            module_id="123",
            module_name="Test Module",
            question_count=5,
            has_content=True,
        )
        assert item.module_id == "123"
        assert item.question_count == 5

    def test_module_coverage_response(self):
        """Should create complete ModuleCoverageResponse."""
        response = ModuleCoverageResponse(
            quiz_id=uuid.uuid4(),
            module=ModuleCoverage(
                module_id="123",
                module_name="Test Module",
                pages=[],
                overall_coverage_percentage=75.0,
                total_sentences=10,
                covered_sentences=7,
                gap_count=2,
            ),
            question_mappings=[],
            statistics=CoverageStatistics(
                total_sentences=10,
                covered_sentences=7,
                coverage_percentage=70.0,
                total_questions=5,
                largest_gap_sentences=3,
            ),
            computed_at=datetime.now(timezone.utc).isoformat(),
        )
        assert response.module.overall_coverage_percentage == 75.0


class TestCoverageGaps:
    """Tests for gap counting logic."""

    def test_count_gaps_no_gaps(self):
        """Should return 0 for fully covered content."""
        pages = [
            AnnotatedPage(
                title="Test",
                sentences=[
                    SentenceCoverage(
                        sentence_index=i,
                        text=f"Sentence {i}",
                        start_char=0,
                        end_char=10,
                        coverage_score=0.8,
                        coverage_level="high",
                        matched_questions=[],
                    )
                    for i in range(5)
                ],
                word_count=50,
                coverage_summary={"high": 5},
            )
        ]
        assert _count_coverage_gaps(pages) == 0

    def test_count_gaps_all_gaps(self):
        """Should count single gap for all uncovered content."""
        pages = [
            AnnotatedPage(
                title="Test",
                sentences=[
                    SentenceCoverage(
                        sentence_index=i,
                        text=f"Sentence {i}",
                        start_char=0,
                        end_char=10,
                        coverage_score=0.0,
                        coverage_level="none",
                        matched_questions=[],
                    )
                    for i in range(5)
                ],
                word_count=50,
                coverage_summary={"none": 5},
            )
        ]
        assert _count_coverage_gaps(pages) == 1

    def test_count_gaps_multiple_gaps(self):
        """Should count multiple separate gaps."""
        sentences = []
        # covered, gap, covered, gap, covered
        levels = ["high", "none", "none", "high", "none", "high"]
        for i, level in enumerate(levels):
            sentences.append(
                SentenceCoverage(
                    sentence_index=i,
                    text=f"Sentence {i}",
                    start_char=0,
                    end_char=10,
                    coverage_score=0.8 if level != "none" else 0.0,
                    coverage_level=level,
                    matched_questions=[],
                )
            )
        pages = [
            AnnotatedPage(
                title="Test",
                sentences=sentences,
                word_count=60,
                coverage_summary={"high": 3, "none": 3},
            )
        ]
        # Two separate gaps: sentences 1-2 and sentence 4
        assert _count_coverage_gaps(pages) == 2


class TestCoverageThresholds:
    """Tests for coverage threshold constants."""

    def test_threshold_ordering(self):
        """Thresholds should be properly ordered."""
        assert COVERAGE_THRESHOLDS["high"] > COVERAGE_THRESHOLDS["medium"]
        assert COVERAGE_THRESHOLDS["medium"] > COVERAGE_THRESHOLDS["low"]
        assert COVERAGE_THRESHOLDS["low"] > 0

    def test_high_threshold(self):
        """High threshold should be 0.7."""
        assert COVERAGE_THRESHOLDS["high"] == 0.7

    def test_medium_threshold(self):
        """Medium threshold should be 0.5."""
        assert COVERAGE_THRESHOLDS["medium"] == 0.5

    def test_low_threshold(self):
        """Low threshold should be 0.3."""
        assert COVERAGE_THRESHOLDS["low"] == 0.3


class TestServiceGetModules:
    """Tests for get_modules_for_coverage service function."""

    def test_get_modules_quiz_not_found(self, session):
        """Should raise ValueError for non-existent quiz."""
        with pytest.raises(ValueError, match="not found"):
            get_modules_for_coverage(session, uuid.uuid4())

    def test_get_modules_no_modules(self, session, quiz):
        """Should return empty list for quiz with no modules."""
        # Update quiz to have no modules
        quiz.selected_modules = {}
        session.commit()

        result = get_modules_for_coverage(session, quiz.id)
        assert result.quiz_id == quiz.id
        assert result.modules == []

    def test_get_modules_with_modules(self, session, quiz):
        """Should return modules with correct data."""
        # Ensure quiz has modules
        quiz.selected_modules = {
            "mod_1": {"name": "Module One"},
            "mod_2": {"name": "Module Two"},
        }
        session.commit()

        result = get_modules_for_coverage(session, quiz.id)
        assert result.quiz_id == quiz.id
        assert len(result.modules) == 2

        module_ids = [m.module_id for m in result.modules]
        assert "mod_1" in module_ids
        assert "mod_2" in module_ids

    def test_get_modules_counts_questions(self, session, quiz_with_content):
        """Should count questions per module correctly."""
        from tests.conftest import create_question_in_session

        # Create questions with module_id
        quiz_with_content.selected_modules = {
            "mod_a": {"name": "Module A"},
            "mod_b": {"name": "Module B"},
        }
        session.commit()

        # Create questions for mod_a
        for _ in range(3):
            create_question_in_session(
                session,
                quiz=quiz_with_content,
                module_id="mod_a",
            )

        # Create questions for mod_b
        for _ in range(2):
            create_question_in_session(
                session,
                quiz=quiz_with_content,
                module_id="mod_b",
            )

        result = get_modules_for_coverage(session, quiz_with_content.id)

        mod_a = next(m for m in result.modules if m.module_id == "mod_a")
        mod_b = next(m for m in result.modules if m.module_id == "mod_b")

        assert mod_a.question_count == 3
        assert mod_b.question_count == 2


@pytest.mark.asyncio
class TestServiceComputeCoverage:
    """Tests for compute_module_coverage service function."""

    async def test_compute_coverage_quiz_not_found(self, async_session):
        """Should raise ValueError for non-existent quiz."""
        with pytest.raises(ValueError, match="not found"):
            await compute_module_coverage(async_session, uuid.uuid4(), "mod_1")

    async def test_compute_coverage_no_content(self, async_session):
        """Should raise ValueError for quiz without extracted content."""
        from tests.conftest import create_quiz_in_async_session

        quiz = await create_quiz_in_async_session(async_session)

        with pytest.raises(ValueError, match="no extracted content"):
            await compute_module_coverage(async_session, quiz.id, "mod_1")

    async def test_compute_coverage_module_not_found(self, async_session):
        """Should raise ValueError for non-existent module."""
        from tests.conftest import create_quiz_in_async_session

        quiz = await create_quiz_in_async_session(
            async_session,
            extracted_content={"mod_1": [{"title": "Test", "content": "Content"}]},
        )

        with pytest.raises(ValueError, match="not found in extracted content"):
            await compute_module_coverage(async_session, quiz.id, "non_existent")

    @patch("src.coverage.service.generate_embeddings")
    async def test_compute_coverage_no_questions(self, mock_embeddings, async_session):
        """Should raise ValueError when no questions for module."""
        from tests.conftest import create_quiz_in_async_session

        quiz = await create_quiz_in_async_session(
            async_session,
            selected_modules={
                "mod_1": {"name": "Module 1", "question_batches": []},
            },
            extracted_content={"mod_1": [{"title": "Test", "content": "Content"}]},
        )

        with pytest.raises(ValueError, match="No questions found"):
            await compute_module_coverage(async_session, quiz.id, "mod_1")

    @patch("src.coverage.service.generate_embeddings")
    async def test_compute_coverage_success(self, mock_embeddings, async_session):
        """Should compute coverage successfully."""
        from tests.conftest import (
            create_question_in_async_session,
            create_quiz_in_async_session,
        )

        # Create quiz with content
        quiz = await create_quiz_in_async_session(
            async_session,
            selected_modules={
                "mod_1": {"name": "Test Module", "question_batches": []},
            },
            extracted_content={
                "mod_1": [
                    {
                        "title": "Page 1",
                        "content": "This is a test sentence. Another sentence here.",
                    }
                ]
            },
        )

        # Create question for the module
        await create_question_in_async_session(
            async_session,
            quiz=quiz,
            module_id="mod_1",
            question_data={
                "question_text": "What is a test?",
                "options": [],
            },
        )

        # Mock embeddings to return vectors with correct dimensions based on input
        def mock_embed_fn(texts: list[str]) -> np.ndarray:
            n = len(texts)
            # Return normalized vectors of shape (n, 3)
            vecs = np.random.randn(n, 3).astype(np.float32)
            # Normalize to unit vectors for proper cosine similarity
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            return vecs / norms

        mock_embeddings.side_effect = mock_embed_fn

        result = await compute_module_coverage(async_session, quiz.id, "mod_1")

        assert result.quiz_id == quiz.id
        assert result.module.module_id == "mod_1"
        assert result.module.module_name == "Test Module"
        assert len(result.question_mappings) == 1
        assert result.statistics.total_questions == 1
