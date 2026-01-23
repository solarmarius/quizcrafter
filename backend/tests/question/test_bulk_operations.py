"""Tests for bulk question operations (approve and delete)."""

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from src.question.models import Question


@pytest.mark.asyncio
async def test_bulk_approve_questions_success(async_session):
    """Test successful bulk approval of multiple questions."""
    from src.question.service import bulk_approve_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    # Create a quiz with multiple unapproved questions
    quiz = await create_quiz_in_async_session(async_session)
    questions = []
    for i in range(3):
        question = await create_question_in_async_session(
            async_session,
            quiz=quiz,
            is_approved=False,
            question_data={"question_text": f"Question {i + 1}"},
        )
        questions.append(question)

    question_ids = [q.id for q in questions]

    # Bulk approve
    result = await bulk_approve_questions(async_session, quiz.id, question_ids)

    assert result["success_count"] == 3
    assert result["failed_count"] == 0
    assert result["failed_ids"] == []
    assert "Approved 3 questions" in result["message"]

    # Verify all questions are now approved
    for qid in question_ids:
        stmt = select(Question).where(Question.id == qid)
        db_result = await async_session.execute(stmt)
        question = db_result.scalar_one()
        assert question.is_approved is True
        assert question.approved_at is not None


@pytest.mark.asyncio
async def test_bulk_approve_questions_with_already_approved(async_session):
    """Test bulk approval when some questions are already approved."""
    from src.question.service import bulk_approve_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)

    # Create mix of approved and unapproved questions
    q1 = await create_question_in_async_session(
        async_session, quiz=quiz, is_approved=False
    )
    q2 = await create_question_in_async_session(
        async_session, quiz=quiz, is_approved=True
    )
    q3 = await create_question_in_async_session(
        async_session, quiz=quiz, is_approved=False
    )

    question_ids = [q1.id, q2.id, q3.id]

    result = await bulk_approve_questions(async_session, quiz.id, question_ids)

    # All 3 should be counted as success (found)
    assert result["success_count"] == 3
    assert result["failed_count"] == 0

    # Verify all are now approved
    for qid in question_ids:
        stmt = select(Question).where(Question.id == qid)
        db_result = await async_session.execute(stmt)
        question = db_result.scalar_one()
        assert question.is_approved is True


@pytest.mark.asyncio
async def test_bulk_approve_questions_with_nonexistent_ids(async_session):
    """Test bulk approval with some non-existent question IDs."""
    from src.question.service import bulk_approve_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    question = await create_question_in_async_session(
        async_session, quiz=quiz, is_approved=False
    )

    nonexistent_id = uuid.uuid4()
    question_ids = [question.id, nonexistent_id]

    result = await bulk_approve_questions(async_session, quiz.id, question_ids)

    assert result["success_count"] == 1
    assert result["failed_count"] == 1
    assert nonexistent_id in result["failed_ids"]
    assert "1 not found" in result["message"]


@pytest.mark.asyncio
async def test_bulk_approve_questions_wrong_quiz(async_session):
    """Test bulk approval fails for questions from a different quiz."""
    from src.question.service import bulk_approve_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz1 = await create_quiz_in_async_session(async_session)
    quiz2 = await create_quiz_in_async_session(async_session)

    # Create question in quiz1
    question = await create_question_in_async_session(
        async_session, quiz=quiz1, is_approved=False
    )
    question_id = question.id  # Store ID before commit

    # Try to approve it using quiz2's ID
    result = await bulk_approve_questions(async_session, quiz2.id, [question_id])

    assert result["success_count"] == 0
    assert result["failed_count"] == 1
    assert question_id in result["failed_ids"]


@pytest.mark.asyncio
async def test_bulk_approve_empty_list(async_session):
    """Test bulk approval with empty question list."""
    from src.question.service import bulk_approve_questions
    from tests.conftest import create_quiz_in_async_session

    quiz = await create_quiz_in_async_session(async_session)

    result = await bulk_approve_questions(async_session, quiz.id, [])

    assert result["success_count"] == 0
    assert result["failed_count"] == 0
    assert result["failed_ids"] == []


@pytest.mark.asyncio
async def test_bulk_delete_questions_success(async_session):
    """Test successful bulk deletion of multiple questions."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    # Create a quiz with multiple questions
    quiz = await create_quiz_in_async_session(async_session, question_count=5)
    initial_count = quiz.question_count

    questions = []
    for i in range(3):
        question = await create_question_in_async_session(
            async_session,
            quiz=quiz,
            question_data={"question_text": f"Question {i + 1}"},
        )
        questions.append(question)

    question_ids = [q.id for q in questions]

    # Bulk delete
    result = await bulk_delete_questions(async_session, quiz.id, question_ids)

    assert result["success_count"] == 3
    assert result["failed_count"] == 0
    assert result["failed_ids"] == []
    assert "Deleted 3 questions" in result["message"]

    # Verify all questions are soft-deleted
    for qid in question_ids:
        stmt = select(Question).where(Question.id == qid)
        db_result = await async_session.execute(stmt)
        question = db_result.scalar_one()
        assert question.deleted is True
        assert question.deleted_at is not None


@pytest.mark.asyncio
async def test_bulk_delete_questions_with_rejection_reason(async_session):
    """Test bulk deletion with rejection reason."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    questions = []
    for i in range(2):
        question = await create_question_in_async_session(async_session, quiz=quiz)
        questions.append(question)

    question_ids = [q.id for q in questions]

    # Bulk delete with rejection reason
    result = await bulk_delete_questions(
        async_session,
        quiz.id,
        question_ids,
        rejection_reason="incorrect_answer",
    )

    assert result["success_count"] == 2

    # Verify rejection reason is set
    for qid in question_ids:
        stmt = select(Question).where(Question.id == qid)
        db_result = await async_session.execute(stmt)
        question = db_result.scalar_one()
        assert question.deleted is True
        assert question.rejection_reason == "incorrect_answer"


@pytest.mark.asyncio
async def test_bulk_delete_questions_with_rejection_feedback(async_session):
    """Test bulk deletion with rejection reason and feedback."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    question = await create_question_in_async_session(async_session, quiz=quiz)
    question_id = question.id  # Store ID before commit
    quiz_id = quiz.id

    feedback_text = "These questions contain outdated information."

    result = await bulk_delete_questions(
        async_session,
        quiz_id,
        [question_id],
        rejection_reason="irrelevant_content",
        rejection_feedback=feedback_text,
    )

    assert result["success_count"] == 1

    # Verify rejection fields
    stmt = select(Question).where(Question.id == question_id)
    db_result = await async_session.execute(stmt)
    deleted_question = db_result.scalar_one()
    assert deleted_question.deleted is True
    assert deleted_question.rejection_reason == "irrelevant_content"
    assert deleted_question.rejection_feedback == feedback_text


@pytest.mark.asyncio
async def test_bulk_delete_questions_with_nonexistent_ids(async_session):
    """Test bulk deletion with some non-existent question IDs."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    question = await create_question_in_async_session(async_session, quiz=quiz)

    nonexistent_id = uuid.uuid4()
    question_ids = [question.id, nonexistent_id]

    result = await bulk_delete_questions(async_session, quiz.id, question_ids)

    assert result["success_count"] == 1
    assert result["failed_count"] == 1
    assert nonexistent_id in result["failed_ids"]
    assert "1 not found" in result["message"]


@pytest.mark.asyncio
async def test_bulk_delete_questions_already_deleted(async_session):
    """Test bulk deletion when questions are already soft-deleted."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    question = await create_question_in_async_session(
        async_session, quiz=quiz, deleted=True
    )
    question_id = question.id  # Store ID before commit
    quiz_id = quiz.id

    result = await bulk_delete_questions(async_session, quiz_id, [question_id])

    # Already deleted questions should not be found
    assert result["success_count"] == 0
    assert result["failed_count"] == 1
    assert question_id in result["failed_ids"]


@pytest.mark.asyncio
async def test_bulk_delete_questions_wrong_quiz(async_session):
    """Test bulk deletion fails for questions from a different quiz."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz1 = await create_quiz_in_async_session(async_session)
    quiz2 = await create_quiz_in_async_session(async_session)
    quiz2_id = quiz2.id

    # Create question in quiz1
    question = await create_question_in_async_session(async_session, quiz=quiz1)
    question_id = question.id  # Store ID before commit

    # Try to delete it using quiz2's ID
    result = await bulk_delete_questions(async_session, quiz2_id, [question_id])

    assert result["success_count"] == 0
    assert result["failed_count"] == 1
    assert question_id in result["failed_ids"]


@pytest.mark.asyncio
async def test_bulk_delete_empty_list(async_session):
    """Test bulk deletion with empty question list."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import create_quiz_in_async_session

    quiz = await create_quiz_in_async_session(async_session)

    result = await bulk_delete_questions(async_session, quiz.id, [])

    assert result["success_count"] == 0
    assert result["failed_count"] == 0
    assert result["failed_ids"] == []


@pytest.mark.asyncio
async def test_bulk_delete_decrements_quiz_question_count(async_session):
    """Test that bulk delete properly decrements the quiz question count."""
    from src.question.service import bulk_delete_questions
    from src.quiz.models import Quiz
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    # Create a quiz with a known question count
    quiz = await create_quiz_in_async_session(async_session, question_count=10)
    quiz_id = quiz.id

    # Create some questions
    questions = []
    for i in range(3):
        question = await create_question_in_async_session(async_session, quiz=quiz)
        questions.append(question)

    question_ids = [q.id for q in questions]

    # Bulk delete
    result = await bulk_delete_questions(async_session, quiz_id, question_ids)

    assert result["success_count"] == 3

    # Refresh quiz and check count was decremented
    stmt = select(Quiz).where(Quiz.id == quiz_id)
    db_result = await async_session.execute(stmt)
    updated_quiz = db_result.scalar_one()

    # The count should be 10 - 3 = 7
    assert updated_quiz.question_count == 7


@pytest.mark.asyncio
async def test_bulk_delete_question_count_not_negative(async_session):
    """Test that bulk delete doesn't make question count negative."""
    from src.question.service import bulk_delete_questions
    from src.quiz.models import Quiz
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    # Create a quiz with question_count of 1
    quiz = await create_quiz_in_async_session(async_session, question_count=1)
    quiz_id = quiz.id

    # Create 3 questions
    questions = []
    for i in range(3):
        question = await create_question_in_async_session(async_session, quiz=quiz)
        questions.append(question)

    question_ids = [q.id for q in questions]

    # Bulk delete all 3
    result = await bulk_delete_questions(async_session, quiz_id, question_ids)

    assert result["success_count"] == 3

    # Question count should be 0, not negative
    stmt = select(Quiz).where(Quiz.id == quiz_id)
    db_result = await async_session.execute(stmt)
    updated_quiz = db_result.scalar_one()

    assert updated_quiz.question_count == 0


@pytest.mark.asyncio
async def test_bulk_approve_sets_timestamps(async_session):
    """Test that bulk approval sets the correct timestamps."""
    from src.question.service import bulk_approve_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    question = await create_question_in_async_session(
        async_session, quiz=quiz, is_approved=False
    )
    question_id = question.id  # Store ID before commit
    quiz_id = quiz.id

    before_approve = datetime.now(timezone.utc)

    result = await bulk_approve_questions(async_session, quiz_id, [question_id])

    after_approve = datetime.now(timezone.utc)

    assert result["success_count"] == 1

    # Check timestamps
    stmt = select(Question).where(Question.id == question_id)
    db_result = await async_session.execute(stmt)
    approved_question = db_result.scalar_one()

    assert approved_question.approved_at is not None
    assert before_approve <= approved_question.approved_at <= after_approve
    assert approved_question.updated_at is not None


@pytest.mark.asyncio
async def test_bulk_delete_sets_timestamps(async_session):
    """Test that bulk deletion sets the correct timestamps."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    question = await create_question_in_async_session(async_session, quiz=quiz)
    question_id = question.id  # Store ID before commit
    quiz_id = quiz.id

    before_delete = datetime.now(timezone.utc)

    result = await bulk_delete_questions(async_session, quiz_id, [question_id])

    after_delete = datetime.now(timezone.utc)

    assert result["success_count"] == 1

    # Check timestamps
    stmt = select(Question).where(Question.id == question_id)
    db_result = await async_session.execute(stmt)
    deleted_question = db_result.scalar_one()

    assert deleted_question.deleted_at is not None
    assert before_delete <= deleted_question.deleted_at <= after_delete


@pytest.mark.asyncio
async def test_bulk_operations_with_large_batch(async_session):
    """Test bulk operations with a larger batch of questions."""
    from src.question.service import bulk_approve_questions, bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session, question_count=50)
    quiz_id = quiz.id  # Store ID before operations

    # Create 20 questions and store their IDs
    question_ids = []
    for i in range(20):
        question = await create_question_in_async_session(
            async_session,
            quiz=quiz,
            is_approved=False,
            question_data={"question_text": f"Batch question {i + 1}"},
        )
        question_ids.append(question.id)

    # Bulk approve all
    approve_result = await bulk_approve_questions(async_session, quiz_id, question_ids)
    assert approve_result["success_count"] == 20
    assert approve_result["failed_count"] == 0

    # Verify all approved
    for qid in question_ids:
        stmt = select(Question).where(Question.id == qid)
        db_result = await async_session.execute(stmt)
        q = db_result.scalar_one()
        assert q.is_approved is True

    # Now bulk delete all
    delete_result = await bulk_delete_questions(
        async_session,
        quiz_id,
        question_ids,
        rejection_reason="quota_reached",
    )
    assert delete_result["success_count"] == 20
    assert delete_result["failed_count"] == 0

    # Verify all deleted
    for qid in question_ids:
        stmt = select(Question).where(Question.id == qid)
        db_result = await async_session.execute(stmt)
        q = db_result.scalar_one()
        assert q.deleted is True
        assert q.rejection_reason == "quota_reached"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "rejection_reason",
    [
        "incorrect_answer",
        "poor_wording",
        "irrelevant_content",
        "duplicate_question",
        "too_easy",
        "too_hard",
        "quota_reached",
        "topic_coverage",
        "other",
    ],
)
async def test_bulk_delete_with_all_rejection_reasons(async_session, rejection_reason):
    """Test bulk deletion stores all valid rejection reasons correctly."""
    from src.question.service import bulk_delete_questions
    from tests.conftest import (
        create_question_in_async_session,
        create_quiz_in_async_session,
    )

    quiz = await create_quiz_in_async_session(async_session)
    question = await create_question_in_async_session(async_session, quiz=quiz)
    question_id = question.id  # Store ID before commit
    quiz_id = quiz.id

    result = await bulk_delete_questions(
        async_session,
        quiz_id,
        [question_id],
        rejection_reason=rejection_reason,
    )

    assert result["success_count"] == 1

    stmt = select(Question).where(Question.id == question_id)
    db_result = await async_session.execute(stmt)
    deleted_question = db_result.scalar_one()

    assert deleted_question.deleted is True
    assert deleted_question.rejection_reason == rejection_reason
