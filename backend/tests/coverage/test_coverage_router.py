"""Integration tests for coverage router endpoints."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.coverage.schemas import (
    AnnotatedPage,
    CoverageStatistics,
    ModuleCoverage,
    ModuleCoverageResponse,
    QuestionMapping,
    SentenceCoverage,
)
from src.main import app
from tests.conftest import (
    create_question_in_session,
    create_quiz_in_session,
    create_user_in_session,
)

# --- Tests for GET /coverage/{quiz_id}/modules endpoint ---


def test_list_modules_returns_404_for_nonexistent_quiz(client: TestClient, user: User):
    """Should return 404 for non-existent quiz."""
    fake_quiz_id = uuid.uuid4()

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{fake_quiz_id}/modules")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_list_modules_returns_404_for_quiz_user_does_not_own(
    client: TestClient, session: Session, user: User
):
    """Should return 404 when user doesn't have access to quiz."""
    owner = create_user_in_session(session)
    quiz = create_quiz_in_session(session, owner=owner, with_extracted_content=True)

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{quiz.id}/modules")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_list_modules_returns_has_content_false_when_no_extracted_content(
    client: TestClient, session: Session, user: User
):
    """Should return modules with has_content=False when no extracted content."""
    quiz = create_quiz_in_session(session, owner=user, with_extracted_content=False)

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{quiz.id}/modules")
        assert response.status_code == 200
        data = response.json()
        assert "modules" in data
        for module in data["modules"]:
            assert module["has_content"] is False
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_list_modules_returns_modules_for_quiz_with_content(
    client: TestClient, session: Session, user: User
):
    """Should return module list for quiz with extracted content."""
    quiz = create_quiz_in_session(
        session,
        owner=user,
        extracted_content={
            "module_1": {
                "pages": [
                    {
                        "page_id": "page_1",
                        "title": "Test Page",
                        "sentences": ["Test sentence one.", "Test sentence two."],
                    }
                ]
            }
        },
    )

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{quiz.id}/modules")
        assert response.status_code == 200
        data = response.json()
        assert "modules" in data
        assert isinstance(data["modules"], list)
        assert len(data["modules"]) > 0
        module_1 = next(
            (m for m in data["modules"] if m["module_id"] == "module_1"), None
        )
        assert module_1 is not None
        assert module_1["has_content"] is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# --- Tests for GET /coverage/{quiz_id}/modules/{module_id} endpoint ---


@patch("src.coverage.router.compute_module_coverage", new_callable=AsyncMock)
def test_get_coverage_returns_400_for_invalid_module_id(
    mock_compute: AsyncMock,
    client: TestClient,
    session: Session,
    user: User,
):
    """Should return 400 for module not in quiz."""
    quiz = create_quiz_in_session(
        session,
        owner=user,
        extracted_content={
            "module_1": {"pages": [{"page_id": "p1", "title": "T", "sentences": ["S"]}]}
        },
    )

    mock_compute.side_effect = ValueError("Module nonexistent_module not found")

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{quiz.id}/modules/nonexistent_module")
        assert response.status_code == 400
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@patch("src.coverage.router.compute_module_coverage", new_callable=AsyncMock)
def test_get_coverage_returns_400_when_no_questions_exist(
    mock_compute: AsyncMock,
    client: TestClient,
    session: Session,
    user: User,
):
    """Should return 400 when module has no questions."""
    quiz = create_quiz_in_session(
        session,
        owner=user,
        extracted_content={
            "module_1": {"pages": [{"page_id": "p1", "title": "T", "sentences": ["S"]}]}
        },
    )

    mock_compute.side_effect = ValueError(
        "No approved questions found for module module_1"
    )

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{quiz.id}/modules/module_1")
        assert response.status_code == 400
        assert "question" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@patch("src.coverage.router.compute_module_coverage", new_callable=AsyncMock)
def test_get_coverage_returns_coverage_with_mocked_service(
    mock_compute: AsyncMock,
    client: TestClient,
    session: Session,
    user: User,
):
    """Should return coverage analysis when service succeeds."""
    quiz = create_quiz_in_session(
        session,
        owner=user,
        extracted_content={
            "module_1": {
                "pages": [
                    {
                        "page_id": "page_1",
                        "title": "Test Page",
                        "sentences": ["Test sentence."],
                    }
                ]
            }
        },
    )

    question = create_question_in_session(session, quiz=quiz, module_id="module_1")

    mock_response = ModuleCoverageResponse(
        quiz_id=quiz.id,
        module=ModuleCoverage(
            module_id="module_1",
            module_name="Introduction",
            pages=[
                AnnotatedPage(
                    title="Test Page",
                    sentences=[
                        SentenceCoverage(
                            sentence_index=0,
                            text="Test sentence.",
                            start_char=0,
                            end_char=14,
                            coverage_score=0.85,
                            coverage_level="high",
                            matched_questions=[question.id],
                            top_question_similarity=0.85,
                        )
                    ],
                    word_count=2,
                    coverage_summary={"high": 1, "medium": 0, "low": 0, "none": 0},
                )
            ],
            overall_coverage_percentage=85.0,
            total_sentences=1,
            covered_sentences=1,
            gap_count=0,
        ),
        statistics=CoverageStatistics(
            total_sentences=1,
            covered_sentences=1,
            coverage_percentage=85.0,
            total_questions=1,
            largest_gap_sentences=0,
        ),
        question_mappings=[
            QuestionMapping(
                question_id=question.id,
                question_text="What is the capital of France?",
                question_type="multiple_choice",
                best_matching_sentences=[0],
                best_similarity_score=0.85,
            )
        ],
        computed_at=datetime.now(timezone.utc).isoformat(),
    )

    mock_compute.return_value = mock_response

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{quiz.id}/modules/module_1")

        assert response.status_code == 200
        data = response.json()
        assert "module" in data
        assert "statistics" in data
        assert "question_mappings" in data
        assert data["module"]["module_id"] == "module_1"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@patch("src.coverage.router.compute_module_coverage", new_callable=AsyncMock)
def test_get_coverage_returns_500_on_service_failure(
    mock_compute: AsyncMock,
    client: TestClient,
    session: Session,
    user: User,
):
    """Should return 500 when service fails unexpectedly."""
    quiz = create_quiz_in_session(
        session,
        owner=user,
        extracted_content={
            "module_1": {"pages": [{"page_id": "p1", "title": "T", "sentences": ["S"]}]}
        },
    )

    create_question_in_session(session, quiz=quiz, module_id="module_1")

    mock_compute.side_effect = Exception("Azure OpenAI API error")

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get(f"/coverage/{quiz.id}/modules/module_1")

        assert response.status_code == 500
        assert "failed" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
