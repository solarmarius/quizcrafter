"""Coverage analysis API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from src.auth.dependencies import CurrentUser
from src.config import get_logger
from src.database import SessionDep, get_async_session
from src.quiz.dependencies import QuizAccess

from .schemas import ModuleCoverageResponse, ModuleListResponse
from .service import compute_module_coverage, get_modules_for_coverage

router = APIRouter(prefix="/coverage", tags=["coverage"])
logger = get_logger("coverage.router")


@router.get("/{quiz_id}/modules", response_model=ModuleListResponse)
def list_coverage_modules(
    quiz_id: UUID,
    quiz: QuizAccess,  # noqa: ARG001
    current_user: CurrentUser,
    session: SessionDep,
) -> ModuleListResponse:
    """
    List modules available for coverage analysis.

    Returns a list of modules with their question counts and content availability.
    Use this to show the user which modules can be analyzed.

    **Parameters:**
        quiz_id (UUID): The UUID of the quiz

    **Returns:**
        ModuleListResponse: List of modules with metadata

    **Authentication:**
        Requires valid JWT token with quiz access (owner or collaborator)
    """
    logger.info(
        "coverage_modules_list_requested",
        quiz_id=str(quiz_id),
        user_id=str(current_user.id),
    )

    try:
        return get_modules_for_coverage(session, quiz_id)

    except ValueError as e:
        logger.warning(
            "coverage_modules_list_validation_error",
            quiz_id=str(quiz_id),
            error=str(e),
        )
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(
            "coverage_modules_list_failed",
            quiz_id=str(quiz_id),
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to list modules for coverage analysis",
        )


@router.get("/{quiz_id}/modules/{module_id}", response_model=ModuleCoverageResponse)
async def get_module_coverage(
    quiz_id: UUID,
    module_id: str,
    quiz: QuizAccess,  # noqa: ARG001
    current_user: CurrentUser,
) -> ModuleCoverageResponse:
    """
    Get content coverage analysis for a specific module.

    Computes sentence-level coverage by comparing question embeddings
    against content sentence embeddings using semantic similarity.

    **Parameters:**
        quiz_id (UUID): The UUID of the quiz
        module_id (str): The module identifier to analyze

    **Returns:**
        ModuleCoverageResponse: Detailed coverage analysis including:
        - Annotated sentences with coverage levels
        - Question-to-content mappings
        - Summary statistics and gap analysis

    **Authentication:**
        Requires valid JWT token with quiz access (owner or collaborator)

    **Performance:**
        First request may take 3-10 seconds due to embedding generation.
        Consider showing a loading indicator in the UI.
    """
    logger.info(
        "coverage_analysis_requested",
        quiz_id=str(quiz_id),
        module_id=module_id,
        user_id=str(current_user.id),
    )

    try:
        async with get_async_session() as session:
            return await compute_module_coverage(session, quiz_id, module_id)

    except ValueError as e:
        logger.warning(
            "coverage_analysis_validation_error",
            quiz_id=str(quiz_id),
            module_id=module_id,
            error=str(e),
        )
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(
            "coverage_analysis_failed",
            quiz_id=str(quiz_id),
            module_id=module_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to compute coverage analysis",
        )
