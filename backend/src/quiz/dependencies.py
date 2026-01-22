"""Quiz module dependencies for FastAPI dependency injection."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from sqlmodel import select

from src.auth.dependencies import CurrentUser
from src.config import get_logger
from src.database import SessionDep

from .models import Quiz
from .schemas import QuizStatus, RegenerateBatchRequest
from .service import get_quiz_by_id
from .sharing_service import is_collaborator
from .validators import (
    is_quiz_processing,
    is_quiz_ready_for_export,
    is_quiz_ready_for_extraction,
    is_quiz_ready_for_generation,
)

logger = get_logger("quiz_dependencies")


def verify_quiz_ownership(
    quiz_id: UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> Quiz:
    """
    Verify that the current user owns the specified quiz.

    Args:
        quiz_id: UUID of the quiz to verify
        current_user: Current authenticated user
        session: Database session

    Returns:
        Quiz object if verification succeeds

    Raises:
        HTTPException: 404 if quiz not found or user doesn't own it
    """
    quiz = get_quiz_by_id(session, quiz_id)

    if not quiz:
        logger.warning(
            "quiz_not_found",
            user_id=str(current_user.id),
            quiz_id=str(quiz_id),
        )
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.owner_id != current_user.id:
        logger.warning(
            "quiz_access_denied",
            user_id=str(current_user.id),
            quiz_id=str(quiz_id),
            quiz_owner_id=str(quiz.owner_id),
        )
        raise HTTPException(status_code=404, detail="Quiz not found")

    return quiz


def verify_quiz_ownership_with_lock(
    quiz_id: UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> Quiz:
    """
    Verify quiz ownership and return quiz with row lock for updates.

    Args:
        quiz_id: UUID of the quiz to verify and lock
        current_user: Current authenticated user
        session: Database session

    Returns:
        Quiz object with row lock if verification succeeds

    Raises:
        HTTPException: 404 if quiz not found or user doesn't own it
    """
    # Get the quiz with row lock
    stmt = select(Quiz).where(Quiz.id == quiz_id).with_for_update()
    quiz = session.exec(stmt).first()

    if not quiz:
        logger.warning(
            "quiz_not_found_with_lock",
            user_id=str(current_user.id),
            quiz_id=str(quiz_id),
        )
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.owner_id != current_user.id:
        logger.warning(
            "quiz_access_denied_with_lock",
            user_id=str(current_user.id),
            quiz_id=str(quiz_id),
            quiz_owner_id=str(quiz.owner_id),
        )
        raise HTTPException(status_code=404, detail="Quiz not found")

    return quiz


def validate_content_extraction_ready(quiz: Quiz) -> None:
    """
    Validate that content extraction can be triggered.

    Args:
        quiz: Quiz to validate

    Raises:
        HTTPException: 409 if extraction already in progress or not ready
    """
    if not is_quiz_ready_for_extraction(quiz):
        if quiz.status == QuizStatus.EXTRACTING_CONTENT:
            logger.warning(
                "content_extraction_already_in_progress",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=409, detail="Content extraction is already in progress"
            )
        elif is_quiz_processing(quiz):
            logger.warning(
                "content_extraction_not_ready_processing",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=409, detail="Quiz is currently being processed"
            )
        else:
            logger.warning(
                "content_extraction_not_ready",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=409,
                detail="Content extraction is not available in current state",
            )


def validate_question_generation_ready(quiz: Quiz) -> None:
    """
    Validate that question generation can be triggered.

    Args:
        quiz: Quiz to validate

    Raises:
        HTTPException: 400 if content extraction not completed
        HTTPException: 409 if generation already in progress
    """
    if not is_quiz_ready_for_generation(quiz):
        if quiz.status == QuizStatus.GENERATING_QUESTIONS:
            logger.warning(
                "question_generation_already_in_progress",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=409, detail="Question generation is already in progress"
            )
        elif quiz.status in [QuizStatus.CREATED, QuizStatus.FAILED]:
            logger.warning(
                "question_generation_content_not_ready",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=400,
                detail="Content extraction must be completed before generating questions",
            )
        else:
            logger.warning(
                "question_generation_not_ready",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=409,
                detail="Question generation is not available in current state",
            )


def validate_question_generation_ready_with_partial_support(quiz: Quiz) -> str:
    """
    Validate that question generation can be triggered with support for partial retries.

    Args:
        quiz: Quiz to validate

    Returns:
        str: Type of generation - "initial" or "retry"

    Raises:
        HTTPException: 400 if content extraction not completed
        HTTPException: 409 if generation already in progress
    """
    if not is_quiz_ready_for_generation(quiz):
        if quiz.status == QuizStatus.GENERATING_QUESTIONS:
            logger.warning(
                "question_generation_already_in_progress",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=409, detail="Question generation is already in progress"
            )
        elif quiz.status in [QuizStatus.CREATED, QuizStatus.FAILED]:
            logger.warning(
                "question_generation_content_not_ready",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=400,
                detail="Content extraction must be completed before generating questions",
            )
        else:
            logger.warning(
                "question_generation_not_ready",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
            )
            raise HTTPException(
                status_code=409,
                detail="Question generation is not available in current state",
            )

    # Determine generation type
    if quiz.status == QuizStatus.READY_FOR_REVIEW_PARTIAL:
        logger.info(
            "question_generation_retry_from_partial",
            quiz_id=str(quiz.id),
            current_status=quiz.status.value,
        )
        return "retry"
    else:
        logger.info(
            "question_generation_initial_attempt",
            quiz_id=str(quiz.id),
            current_status=quiz.status.value,
        )
        return "initial"


def validate_single_batch_regeneration_ready(
    quiz: Quiz, batch_request: RegenerateBatchRequest
) -> None:
    """
    Validate that single batch regeneration can be triggered.

    Allows regeneration from READY_FOR_REVIEW or READY_FOR_REVIEW_PARTIAL states.
    Validates that the batch specification matches an existing batch in the quiz.

    Args:
        quiz: Quiz to validate
        batch_request: The batch specification to regenerate

    Raises:
        HTTPException: 409 if quiz not in valid state for regeneration
        HTTPException: 400 if batch specification doesn't match quiz configuration
    """
    # Check quiz is in a valid state for single batch regeneration
    if quiz.status not in [
        QuizStatus.READY_FOR_REVIEW,
        QuizStatus.READY_FOR_REVIEW_PARTIAL,
    ]:
        logger.warning(
            "single_batch_regeneration_invalid_state",
            quiz_id=str(quiz.id),
            current_status=quiz.status.value,
        )
        raise HTTPException(
            status_code=409,
            detail="Quiz must be in review state for batch regeneration",
        )

    # Verify module_id exists in quiz.selected_modules
    selected_modules = quiz.selected_modules or {}
    if batch_request.module_id not in selected_modules:
        logger.warning(
            "single_batch_regeneration_module_not_found",
            quiz_id=str(quiz.id),
            module_id=batch_request.module_id,
            available_modules=list(selected_modules.keys()),
        )
        raise HTTPException(
            status_code=400,
            detail=f"Module {batch_request.module_id} not found in quiz configuration",
        )

    # Verify batch spec exists in module's question_batches
    module_data = selected_modules[batch_request.module_id]
    question_batches = module_data.get("question_batches", [])

    batch_found = False
    for batch in question_batches:
        batch_type = batch.get("question_type")
        batch_difficulty = batch.get("difficulty")
        if (
            batch_type == batch_request.question_type.value
            and batch_difficulty == batch_request.difficulty.value
        ):
            batch_found = True
            break

    if not batch_found:
        logger.warning(
            "single_batch_regeneration_batch_not_found",
            quiz_id=str(quiz.id),
            module_id=batch_request.module_id,
            question_type=batch_request.question_type.value,
            difficulty=batch_request.difficulty.value,
            available_batches=question_batches,
        )
        raise HTTPException(
            status_code=400,
            detail="Specified batch not found in quiz configuration",
        )

    logger.info(
        "single_batch_regeneration_validated",
        quiz_id=str(quiz.id),
        module_id=batch_request.module_id,
        question_type=batch_request.question_type.value,
        count=batch_request.count,
        difficulty=batch_request.difficulty.value,
    )


def validate_export_ready(quiz: Quiz) -> None:
    """
    Validate that quiz export can be triggered.

    Args:
        quiz: Quiz to validate

    Raises:
        HTTPException: 409 if already exported or export in progress
    """
    if not is_quiz_ready_for_export(quiz):
        if quiz.status == QuizStatus.PUBLISHED and quiz.canvas_quiz_id:
            logger.warning(
                "quiz_export_already_completed",
                quiz_id=str(quiz.id),
                canvas_quiz_id=quiz.canvas_quiz_id,
            )
            raise HTTPException(
                status_code=409, detail="Quiz has already been exported to Canvas"
            )
        elif quiz.status == QuizStatus.EXPORTING_TO_CANVAS:
            logger.warning(
                "quiz_export_already_in_progress",
                quiz_id=str(quiz.id),
            )
            raise HTTPException(
                status_code=409, detail="Quiz export is already in progress"
            )
        else:
            logger.warning(
                "quiz_export_not_ready",
                quiz_id=str(quiz.id),
                current_status=quiz.status,
                failure_reason=quiz.failure_reason
                if quiz.status == QuizStatus.FAILED
                else None,
            )
            raise HTTPException(status_code=409, detail="Quiz is not ready for export")


async def validate_quiz_has_approved_questions(
    quiz: Quiz,
    session: SessionDep,  # noqa: ARG001
) -> None:
    """
    Validate that quiz has approved questions for export.

    Args:
        quiz: Quiz to validate
        session: Database session

    Raises:
        HTTPException: 400 if no approved questions found
    """
    from src.database import get_async_session
    from src.question import service as question_service

    async with get_async_session() as async_session:
        approved_questions = await question_service.get_questions_by_quiz(
            async_session, quiz_id=quiz.id, approved_only=True
        )

    if not approved_questions:
        logger.warning(
            "quiz_export_no_approved_questions",
            quiz_id=str(quiz.id),
        )
        raise HTTPException(
            status_code=400, detail="Quiz has no approved questions to export"
        )


def verify_quiz_access(
    quiz_id: UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> Quiz:
    """
    Verify that the current user can access the quiz (owner OR collaborator).

    Use this for operations that collaborators can perform:
    view, edit questions, generate questions.

    Args:
        quiz_id: UUID of the quiz to verify
        current_user: Current authenticated user
        session: Database session

    Returns:
        Quiz object if verification succeeds

    Raises:
        HTTPException: 404 if quiz not found or user doesn't have access
    """
    quiz = get_quiz_by_id(session, quiz_id)

    if not quiz:
        logger.warning(
            "quiz_not_found",
            user_id=str(current_user.id),
            quiz_id=str(quiz_id),
        )
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Check ownership
    if quiz.owner_id == current_user.id:
        return quiz

    # Check collaboration
    if is_collaborator(session, quiz_id, current_user.id):
        return quiz

    logger.warning(
        "quiz_access_denied",
        user_id=str(current_user.id),
        quiz_id=str(quiz_id),
        quiz_owner_id=str(quiz.owner_id),
    )
    raise HTTPException(status_code=404, detail="Quiz not found")


def verify_quiz_access_with_lock(
    quiz_id: UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> Quiz:
    """
    Verify quiz access (owner OR collaborator) and return quiz with row lock.

    Args:
        quiz_id: UUID of the quiz to verify and lock
        current_user: Current authenticated user
        session: Database session

    Returns:
        Quiz object with row lock if verification succeeds

    Raises:
        HTTPException: 404 if quiz not found or user doesn't have access
    """
    # Get the quiz with row lock
    stmt = select(Quiz).where(Quiz.id == quiz_id).with_for_update()
    quiz = session.exec(stmt).first()

    if not quiz:
        logger.warning(
            "quiz_not_found_with_lock",
            user_id=str(current_user.id),
            quiz_id=str(quiz_id),
        )
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Check ownership
    if quiz.owner_id == current_user.id:
        return quiz

    # Check collaboration
    if is_collaborator(session, quiz_id, current_user.id):
        return quiz

    logger.warning(
        "quiz_access_denied_with_lock",
        user_id=str(current_user.id),
        quiz_id=str(quiz_id),
        quiz_owner_id=str(quiz.owner_id),
    )
    raise HTTPException(status_code=404, detail="Quiz not found")


# Type aliases for common dependency combinations
QuizOwnership = Annotated[Quiz, Depends(verify_quiz_ownership)]
QuizOwnershipWithLock = Annotated[Quiz, Depends(verify_quiz_ownership_with_lock)]
QuizAccess = Annotated[Quiz, Depends(verify_quiz_access)]
QuizAccessWithLock = Annotated[Quiz, Depends(verify_quiz_access_with_lock)]
