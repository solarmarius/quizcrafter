"""Router for quiz sharing functionality."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from src.auth.dependencies import CurrentUser
from src.config import get_logger
from src.database import SessionDep

from .dependencies import QuizOwnership
from .models import Quiz
from .sharing_schemas import (
    AcceptInviteResponse,
    CollaboratorResponse,
    InviteInfoResponse,
    QuizCollaboratorsResponse,
    QuizInviteCreate,
    QuizInviteResponse,
)
from .sharing_service import (
    accept_quiz_invite,
    build_invite_url,
    create_quiz_invite,
    get_active_invites,
    get_invite_by_token,
    get_quiz_collaborators,
    remove_collaborator,
    revoke_invite,
    validate_invite,
)

router = APIRouter(prefix="/quiz", tags=["quiz-sharing"])
logger = get_logger("quiz_sharing")


# ========== Owner-only endpoints ==========


@router.post("/{quiz_id}/invites", response_model=QuizInviteResponse)
def create_invite(
    quiz: QuizOwnership,
    invite_data: QuizInviteCreate,
    current_user: CurrentUser,
    session: SessionDep,
) -> QuizInviteResponse:
    """
    Create a new invite link for a quiz.

    Only the quiz owner can create invites.

    **Parameters:**
        quiz_id: UUID of the quiz
        invite_data: Invite configuration (expires_in_days, max_uses)

    **Returns:**
        QuizInviteResponse with the invite details and URL
    """
    invite = create_quiz_invite(
        session=session,
        quiz=quiz,
        created_by_id=current_user.id,
        expires_in_days=invite_data.expires_in_days,
        max_uses=invite_data.max_uses,
    )

    return QuizInviteResponse(
        id=invite.id,
        token=invite.token,
        invite_url=build_invite_url(invite.token),
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
        max_uses=invite.max_uses,
        use_count=invite.use_count,
        is_revoked=invite.is_revoked,
    )


@router.get("/{quiz_id}/collaborators", response_model=QuizCollaboratorsResponse)
def list_collaborators(
    quiz: QuizOwnership,
    session: SessionDep,
) -> QuizCollaboratorsResponse:
    """
    List all collaborators and active invites for a quiz.

    Only the quiz owner can view the full list.

    **Returns:**
        QuizCollaboratorsResponse with owner info, collaborators, and active invites
    """
    collaborators = get_quiz_collaborators(session, quiz.id)
    active_invites = get_active_invites(session, quiz.id)

    # Build collaborator responses
    collaborator_responses = []
    for collab in collaborators:
        # Load user relationship if needed
        user = collab.user
        collaborator_responses.append(
            CollaboratorResponse(
                id=collab.id,
                user_id=collab.user_id,
                user_name=user.name if user else None,
                added_at=collab.created_at,
            )
        )

    # Build invite responses
    invite_responses = [
        QuizInviteResponse(
            id=invite.id,
            token=invite.token,
            invite_url=build_invite_url(invite.token),
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            created_at=invite.created_at,
            expires_at=invite.expires_at,
            max_uses=invite.max_uses,
            use_count=invite.use_count,
            is_revoked=invite.is_revoked,
        )
        for invite in active_invites
    ]

    # Get owner info
    owner = quiz.owner

    return QuizCollaboratorsResponse(
        quiz_id=quiz.id,
        owner_id=quiz.owner_id,
        owner_name=owner.name if owner else None,
        collaborators=collaborator_responses,
        active_invites=invite_responses,
    )


@router.delete("/{quiz_id}/collaborators/{collaborator_id}")
def remove_collaborator_endpoint(
    quiz: QuizOwnership,
    collaborator_id: UUID,
    session: SessionDep,
) -> dict[str, str]:
    """
    Remove a collaborator from a quiz.

    Only the quiz owner can remove collaborators.

    **Parameters:**
        quiz_id: UUID of the quiz
        collaborator_id: UUID of the QuizCollaborator record to remove

    **Returns:**
        Success message
    """
    if not remove_collaborator(session, quiz.id, collaborator_id):
        raise HTTPException(status_code=404, detail="Collaborator not found")

    return {"message": "Collaborator removed successfully"}


@router.delete("/{quiz_id}/invites/{invite_id}")
def revoke_invite_endpoint(
    quiz: QuizOwnership,
    invite_id: UUID,
    session: SessionDep,
) -> dict[str, str]:
    """
    Revoke an invite link.

    Only the quiz owner can revoke invites.

    **Parameters:**
        quiz_id: UUID of the quiz
        invite_id: UUID of the QuizInvite to revoke

    **Returns:**
        Success message
    """
    if not revoke_invite(session, quiz.id, invite_id):
        raise HTTPException(status_code=404, detail="Invite not found")

    return {"message": "Invite revoked successfully"}


# ========== Public invite endpoints (require auth but any user) ==========


@router.get("/invite/{token}", response_model=InviteInfoResponse)
def get_invite_info(
    token: str,
    current_user: CurrentUser,  # noqa: ARG001 - Used for auth enforcement
    session: SessionDep,
) -> InviteInfoResponse:
    """
    Get information about an invite without accepting it.

    Used to show invite details on the accept page before the user clicks accept.
    Requires authentication to prevent invite enumeration.

    **Parameters:**
        token: Invite token from the URL

    **Returns:**
        InviteInfoResponse with quiz title, owner name, and validity status
    """
    invite = get_invite_by_token(session, token)

    if not invite:
        return InviteInfoResponse(
            quiz_title="",
            owner_name=None,
            is_valid=False,
            message="Invite not found",
        )

    # Check validity
    is_valid, error_message = validate_invite(invite)

    # Get quiz info
    quiz = session.get(Quiz, invite.quiz_id)
    if not quiz or quiz.deleted:
        return InviteInfoResponse(
            quiz_title="",
            owner_name=None,
            is_valid=False,
            message="Quiz not found",
        )

    owner = quiz.owner

    return InviteInfoResponse(
        quiz_title=quiz.title,
        owner_name=owner.name if owner else None,
        is_valid=is_valid,
        message=error_message,
    )


@router.post("/invite/{token}/accept", response_model=AcceptInviteResponse)
def accept_invite(
    token: str,
    current_user: CurrentUser,
    session: SessionDep,
) -> AcceptInviteResponse:
    """
    Accept an invite and become a collaborator.

    **Parameters:**
        token: Invite token from the URL

    **Returns:**
        AcceptInviteResponse with success status and quiz info

    **Edge cases handled:**
        - Owner clicking their own link: Returns success with special message
        - Already a collaborator: Returns success without duplicate
        - Expired invite: Returns 410 Gone
        - Revoked invite: Returns 410 Gone
        - Max uses reached: Returns 410 Gone
        - Quiz deleted: Returns 404
    """
    invite = get_invite_by_token(session, token)

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    # Check validity
    is_valid, error_message = validate_invite(invite)
    if not is_valid:
        raise HTTPException(status_code=410, detail=error_message)

    # Get quiz to check if it exists and is not deleted
    quiz = session.get(Quiz, invite.quiz_id)
    if not quiz or quiz.deleted:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Accept the invite
    collaborator, message = accept_quiz_invite(session, invite, current_user.id)

    return AcceptInviteResponse(
        success=True,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        message=message,
    )
