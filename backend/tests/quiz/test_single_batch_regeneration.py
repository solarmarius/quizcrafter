"""Tests for single batch regeneration feature.

This file contains tests for:
- Validation of single batch regeneration readiness
- Service function for preparing batch generation
- API endpoint for triggering batch regeneration
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from sqlmodel import Session

from tests.conftest import create_user_in_session

# === Validation Tests ===


def test_validate_single_batch_regeneration_ready_success():
    """Test successful validation for single batch regeneration."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.dependencies import validate_single_batch_regeneration_ready
    from src.quiz.schemas import QuizStatus, RegenerateBatchRequest

    # Create mock quiz in READY_FOR_REVIEW state
    quiz = create_mock_quiz_with_modules(status=QuizStatus.READY_FOR_REVIEW)

    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    # Should not raise any exception
    validate_single_batch_regeneration_ready(quiz, batch_request)


def test_validate_single_batch_regeneration_ready_partial_success():
    """Test validation passes for READY_FOR_REVIEW_PARTIAL state."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.dependencies import validate_single_batch_regeneration_ready
    from src.quiz.schemas import QuizStatus, RegenerateBatchRequest

    quiz = create_mock_quiz_with_modules(status=QuizStatus.READY_FOR_REVIEW_PARTIAL)

    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    # Should not raise any exception
    validate_single_batch_regeneration_ready(quiz, batch_request)


def test_validate_single_batch_regeneration_invalid_status():
    """Test validation fails when quiz is not in review state."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.dependencies import validate_single_batch_regeneration_ready
    from src.quiz.schemas import QuizStatus, RegenerateBatchRequest

    # Test various invalid statuses
    invalid_statuses = [
        QuizStatus.CREATED,
        QuizStatus.EXTRACTING_CONTENT,
        QuizStatus.GENERATING_QUESTIONS,
        QuizStatus.EXPORTING_TO_CANVAS,
        QuizStatus.PUBLISHED,
        QuizStatus.FAILED,
    ]

    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    for status in invalid_statuses:
        quiz = create_mock_quiz_with_modules(status=status)

        with pytest.raises(HTTPException) as exc_info:
            validate_single_batch_regeneration_ready(quiz, batch_request)

        assert exc_info.value.status_code == 409
        assert "review state" in exc_info.value.detail


def test_validate_single_batch_regeneration_module_not_found():
    """Test validation fails when module_id doesn't exist in quiz."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.dependencies import validate_single_batch_regeneration_ready
    from src.quiz.schemas import QuizStatus, RegenerateBatchRequest

    quiz = create_mock_quiz_with_modules(status=QuizStatus.READY_FOR_REVIEW)

    batch_request = RegenerateBatchRequest(
        module_id="nonexistent_module",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    with pytest.raises(HTTPException) as exc_info:
        validate_single_batch_regeneration_ready(quiz, batch_request)

    assert exc_info.value.status_code == 400
    assert "not found in quiz configuration" in exc_info.value.detail


def test_validate_single_batch_regeneration_batch_not_found():
    """Test validation fails when batch spec doesn't match quiz configuration."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.dependencies import validate_single_batch_regeneration_ready
    from src.quiz.schemas import QuizStatus, RegenerateBatchRequest

    quiz = create_mock_quiz_with_modules(status=QuizStatus.READY_FOR_REVIEW)

    # Request a question type that doesn't exist in the module
    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.TRUE_FALSE,  # Not in mock quiz
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    with pytest.raises(HTTPException) as exc_info:
        validate_single_batch_regeneration_ready(quiz, batch_request)

    assert exc_info.value.status_code == 400
    assert "not found in quiz configuration" in exc_info.value.detail


def test_validate_single_batch_regeneration_wrong_difficulty():
    """Test validation fails when difficulty doesn't match quiz configuration."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.dependencies import validate_single_batch_regeneration_ready
    from src.quiz.schemas import QuizStatus, RegenerateBatchRequest

    quiz = create_mock_quiz_with_modules(status=QuizStatus.READY_FOR_REVIEW)

    # Request a difficulty that doesn't exist for this question type
    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.HARD,  # Mock has MEDIUM
    )

    with pytest.raises(HTTPException) as exc_info:
        validate_single_batch_regeneration_ready(quiz, batch_request)

    assert exc_info.value.status_code == 400
    assert "not found in quiz configuration" in exc_info.value.detail


# === Service Tests ===


def test_prepare_single_batch_generation_canvas_module(session: Session):
    """Test preparing single batch generation for a Canvas module."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.schemas import RegenerateBatchRequest
    from src.quiz.service import prepare_single_batch_generation

    user = create_user_in_session(session)
    quiz = create_test_quiz_with_content(session, user.id)

    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    result = prepare_single_batch_generation(session, quiz.id, user.id, batch_request)

    assert result["quiz_id"] == quiz.id
    assert result["module_id"] == "456"
    assert result["module_name"] == "Test Module"
    assert result["module_content"] == "Test module content for question generation."
    assert result["question_type"] == QuestionType.MULTIPLE_CHOICE
    assert result["count"] == 5
    assert result["difficulty"] == QuestionDifficulty.MEDIUM
    assert "llm_model" in result
    assert "llm_temperature" in result
    assert "language" in result


def test_prepare_single_batch_generation_manual_module(session: Session):
    """Test preparing single batch generation for a manual module."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.schemas import RegenerateBatchRequest
    from src.quiz.service import prepare_single_batch_generation

    user = create_user_in_session(session)
    quiz = create_test_quiz_with_manual_module(session, user.id)

    batch_request = RegenerateBatchRequest(
        module_id="manual_123",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    result = prepare_single_batch_generation(session, quiz.id, user.id, batch_request)

    assert result["module_id"] == "manual_123"
    assert result["module_content"] == "Manual module content for testing."


def test_prepare_single_batch_generation_quiz_not_found(session: Session):
    """Test preparing single batch generation fails when quiz doesn't exist."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.schemas import RegenerateBatchRequest
    from src.quiz.service import prepare_single_batch_generation

    user = create_user_in_session(session)
    non_existent_id = uuid.uuid4()

    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    with pytest.raises(ValueError, match="not found"):
        prepare_single_batch_generation(
            session, non_existent_id, user.id, batch_request
        )


def test_prepare_single_batch_generation_no_content(session: Session):
    """Test preparing single batch generation fails when module has no content."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.schemas import RegenerateBatchRequest
    from src.quiz.service import prepare_single_batch_generation

    user = create_user_in_session(session)
    quiz = create_test_quiz_without_content(session, user.id)

    batch_request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=5,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    with pytest.raises(ValueError, match="No content found"):
        prepare_single_batch_generation(session, quiz.id, user.id, batch_request)


# === Schema Tests ===


def test_regenerate_batch_request_schema_valid():
    """Test RegenerateBatchRequest schema with valid data."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.schemas import RegenerateBatchRequest

    request = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=10,
        difficulty=QuestionDifficulty.MEDIUM,
    )

    assert request.module_id == "456"
    assert request.question_type == QuestionType.MULTIPLE_CHOICE
    assert request.count == 10
    assert request.difficulty == QuestionDifficulty.MEDIUM


def test_regenerate_batch_request_schema_count_bounds():
    """Test RegenerateBatchRequest schema enforces count bounds."""
    from pydantic import ValidationError

    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.schemas import RegenerateBatchRequest

    # Test minimum (1)
    request_min = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=1,
        difficulty=QuestionDifficulty.EASY,
    )
    assert request_min.count == 1

    # Test maximum (20)
    request_max = RegenerateBatchRequest(
        module_id="456",
        question_type=QuestionType.MULTIPLE_CHOICE,
        count=20,
        difficulty=QuestionDifficulty.HARD,
    )
    assert request_max.count == 20

    # Test below minimum
    with pytest.raises(ValidationError):
        RegenerateBatchRequest(
            module_id="456",
            question_type=QuestionType.MULTIPLE_CHOICE,
            count=0,
            difficulty=QuestionDifficulty.MEDIUM,
        )

    # Test above maximum
    with pytest.raises(ValidationError):
        RegenerateBatchRequest(
            module_id="456",
            question_type=QuestionType.MULTIPLE_CHOICE,
            count=21,
            difficulty=QuestionDifficulty.MEDIUM,
        )


# === Helper Functions ===


def create_mock_quiz_with_modules(status=None, failure_reason=None):
    """Create a mock quiz with module configuration for validation tests."""
    from src.quiz.schemas import QuizStatus

    mock_quiz = Mock()
    mock_quiz.id = uuid.uuid4()
    mock_quiz.owner_id = uuid.uuid4()
    mock_quiz.status = status or QuizStatus.READY_FOR_REVIEW
    mock_quiz.failure_reason = failure_reason
    mock_quiz.canvas_quiz_id = None
    mock_quiz.last_status_update = datetime.now(timezone.utc)

    # Add selected_modules with batch configuration
    mock_quiz.selected_modules = {
        "456": {
            "name": "Test Module",
            "source_type": "canvas",
            "question_batches": [
                {
                    "question_type": "multiple_choice",
                    "count": 10,
                    "difficulty": "medium",
                }
            ],
        }
    }

    return mock_quiz


def create_test_quiz_with_content(
    session: Session, owner_id: uuid.UUID, title: str = "Test Quiz"
):
    """Create a test quiz with extracted content for service tests."""
    from src.question.types import QuestionDifficulty, QuestionType
    from src.quiz.models import Quiz
    from src.quiz.schemas import QuizStatus

    quiz = Quiz(
        owner_id=owner_id,
        canvas_course_id=12345,
        canvas_course_name="Test Course",
        title=title,
        question_count=10,
        llm_model="gpt-5-mini-2025-08-07",
        llm_temperature=1.0,
        language="en",
        status=QuizStatus.READY_FOR_REVIEW,
        selected_modules={
            "456": {
                "name": "Test Module",
                "source_type": "canvas",
                "question_batches": [
                    {
                        "question_type": "multiple_choice",
                        "count": 10,
                        "difficulty": "medium",
                    }
                ],
            }
        },
        extracted_content={
            "456": {
                "content": "Test module content for question generation.",
                "word_count": 10,
            }
        },
    )

    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return quiz


def create_test_quiz_with_manual_module(
    session: Session, owner_id: uuid.UUID, title: str = "Test Quiz"
):
    """Create a test quiz with a manual module for service tests."""
    from src.quiz.models import Quiz
    from src.quiz.schemas import QuizStatus

    quiz = Quiz(
        owner_id=owner_id,
        canvas_course_id=12345,
        canvas_course_name="Test Course",
        title=title,
        question_count=10,
        llm_model="gpt-5-mini-2025-08-07",
        llm_temperature=1.0,
        language="en",
        status=QuizStatus.READY_FOR_REVIEW,
        selected_modules={
            "manual_123": {
                "name": "Manual Module",
                "source_type": "manual",
                "content": "Manual module content for testing.",
                "word_count": 5,
                "question_batches": [
                    {
                        "question_type": "multiple_choice",
                        "count": 10,
                        "difficulty": "medium",
                    }
                ],
            }
        },
        extracted_content={},
    )

    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return quiz


def create_test_quiz_without_content(
    session: Session, owner_id: uuid.UUID, title: str = "Test Quiz"
):
    """Create a test quiz without extracted content for service tests."""
    from src.quiz.models import Quiz
    from src.quiz.schemas import QuizStatus

    quiz = Quiz(
        owner_id=owner_id,
        canvas_course_id=12345,
        canvas_course_name="Test Course",
        title=title,
        question_count=10,
        llm_model="gpt-5-mini-2025-08-07",
        llm_temperature=1.0,
        language="en",
        status=QuizStatus.READY_FOR_REVIEW,
        selected_modules={
            "456": {
                "name": "Test Module",
                "source_type": "canvas",
                "question_batches": [
                    {
                        "question_type": "multiple_choice",
                        "count": 10,
                        "difficulty": "medium",
                    }
                ],
            }
        },
        extracted_content={},  # Empty - no content
    )

    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return quiz
