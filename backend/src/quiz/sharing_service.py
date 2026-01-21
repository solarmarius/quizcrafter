"""Service functions for quiz sharing functionality."""

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlmodel import Session, select

from src.config import get_logger, settings

from .models import Quiz, QuizCollaborator, QuizInvite

logger = get_logger("quiz_sharing_service")


def generate_invite_token() -> str:
    """Generate a cryptographically secure URL-safe token."""
    return secrets.token_urlsafe(32)  # 43 characters


def has_active_invite(session: Session, quiz_id: UUID) -> bool:
    """Check if quiz already has an active invite."""
    active_invites = get_active_invites(session, quiz_id)
    return len(active_invites) > 0


class InviteAlreadyExistsError(Exception):
    """Raised when trying to create an invite for a quiz that already has one."""

    pass


def create_quiz_invite(
    session: Session,
    quiz: Quiz,
    created_by_id: UUID,
    expires_in_days: int | None = 7,
    max_uses: int | None = None,
) -> QuizInvite:
    """
    Create a new invite for a quiz.

    Args:
        session: Database session
        quiz: Quiz to create invite for
        created_by_id: ID of the user creating the invite
        expires_in_days: Days until expiration, None for no expiration
        max_uses: Maximum number of uses, None for unlimited

    Returns:
        Created QuizInvite instance

    Raises:
        InviteAlreadyExistsError: If quiz already has an active invite
    """
    # Check if there's already an active invite
    if has_active_invite(session, quiz.id):
        raise InviteAlreadyExistsError(
            "Quiz already has an active invite. Revoke it first to create a new one."
        )

    token = generate_invite_token()

    expires_at = None
    if expires_in_days is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

    invite = QuizInvite(
        quiz_id=quiz.id,
        token=token,
        created_by_id=created_by_id,
        expires_at=expires_at,
        max_uses=max_uses,
        use_count=0,
        is_revoked=False,
    )

    session.add(invite)
    session.commit()
    session.refresh(invite)

    logger.info(
        "quiz_invite_created",
        quiz_id=str(quiz.id),
        invite_id=str(invite.id),
        created_by_id=str(created_by_id),
        expires_at=str(expires_at) if expires_at else None,
        max_uses=max_uses,
    )

    return invite


def get_invite_by_token(session: Session, token: str) -> QuizInvite | None:
    """Get invite by token."""
    stmt = select(QuizInvite).where(QuizInvite.token == token)
    return session.exec(stmt).first()


def validate_invite(invite: QuizInvite) -> tuple[bool, str | None]:
    """
    Validate if invite can be used.

    Returns:
        Tuple of (is_valid, error_message)
    """
    if invite.is_revoked:
        return False, "This invite has been revoked"

    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        return False, "This invite has expired"

    if invite.max_uses is not None and invite.use_count >= invite.max_uses:
        return False, "This invite has reached its maximum number of uses"

    return True, None


def accept_quiz_invite(
    session: Session,
    invite: QuizInvite,
    user_id: UUID,
) -> tuple[QuizCollaborator | None, str]:
    """
    Accept invite and create collaborator relationship.

    Args:
        session: Database session
        invite: QuizInvite to accept
        user_id: ID of user accepting the invite

    Returns:
        Tuple of (QuizCollaborator or None, message)
    """
    # Get the quiz
    quiz = session.get(Quiz, invite.quiz_id)
    if not quiz:
        logger.warning(
            "quiz_invite_accept_quiz_not_found",
            invite_id=str(invite.id),
            quiz_id=str(invite.quiz_id),
        )
        return None, "Quiz not found"

    # Check if user is the owner
    if quiz.owner_id == user_id:
        logger.info(
            "quiz_invite_accept_by_owner",
            quiz_id=str(quiz.id),
            user_id=str(user_id),
        )
        return None, "You already own this quiz"

    # Check if already a collaborator
    existing = session.exec(
        select(QuizCollaborator)
        .where(QuizCollaborator.quiz_id == invite.quiz_id)
        .where(QuizCollaborator.user_id == user_id)
    ).first()

    if existing:
        logger.info(
            "quiz_invite_accept_already_collaborator",
            quiz_id=str(quiz.id),
            user_id=str(user_id),
        )
        return existing, "You already have access to this quiz"

    # Create collaborator
    collaborator = QuizCollaborator(
        quiz_id=invite.quiz_id,
        user_id=user_id,
    )
    session.add(collaborator)

    # Increment invite use count
    invite.use_count += 1
    session.add(invite)

    session.commit()
    session.refresh(collaborator)

    logger.info(
        "quiz_collaborator_added",
        quiz_id=str(quiz.id),
        user_id=str(user_id),
        invite_id=str(invite.id),
    )

    return collaborator, "You now have access to this quiz"


def get_quiz_collaborators(session: Session, quiz_id: UUID) -> list[QuizCollaborator]:
    """Get all collaborators for a quiz."""
    stmt = select(QuizCollaborator).where(QuizCollaborator.quiz_id == quiz_id)
    return list(session.exec(stmt).all())


def get_active_invites(session: Session, quiz_id: UUID) -> list[QuizInvite]:
    """Get all active (non-revoked, non-expired) invites for a quiz."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(QuizInvite)
        .where(QuizInvite.quiz_id == quiz_id)
        .where(QuizInvite.is_revoked == False)  # noqa: E712
        .where(
            (QuizInvite.expires_at.is_(None)) | (QuizInvite.expires_at > now)  # type: ignore
        )
    )
    return list(session.exec(stmt).all())


def remove_collaborator(session: Session, quiz_id: UUID, collaborator_id: UUID) -> bool:
    """
    Remove a collaborator from quiz.

    Args:
        session: Database session
        quiz_id: ID of the quiz
        collaborator_id: ID of the QuizCollaborator record to remove

    Returns:
        True if removed, False if not found
    """
    collaborator = session.get(QuizCollaborator, collaborator_id)

    if not collaborator or collaborator.quiz_id != quiz_id:
        return False

    session.delete(collaborator)
    session.commit()

    logger.info(
        "quiz_collaborator_removed",
        quiz_id=str(quiz_id),
        collaborator_id=str(collaborator_id),
        user_id=str(collaborator.user_id),
    )

    return True


def revoke_invite(session: Session, quiz_id: UUID, invite_id: UUID) -> bool:
    """
    Revoke an invite.

    Args:
        session: Database session
        quiz_id: ID of the quiz
        invite_id: ID of the QuizInvite to revoke

    Returns:
        True if revoked, False if not found
    """
    invite = session.get(QuizInvite, invite_id)

    if not invite or invite.quiz_id != quiz_id:
        return False

    invite.is_revoked = True
    session.add(invite)
    session.commit()

    logger.info(
        "quiz_invite_revoked",
        quiz_id=str(quiz_id),
        invite_id=str(invite_id),
    )

    return True


def is_collaborator(session: Session, quiz_id: UUID, user_id: UUID) -> bool:
    """Check if user is a collaborator on quiz."""
    stmt = (
        select(QuizCollaborator)
        .where(QuizCollaborator.quiz_id == quiz_id)
        .where(QuizCollaborator.user_id == user_id)
    )
    return session.exec(stmt).first() is not None


def can_access_quiz(session: Session, quiz: Quiz, user_id: UUID) -> bool:
    """Check if user can access quiz (owner OR collaborator)."""
    if quiz.owner_id == user_id:
        return True
    return is_collaborator(session, quiz.id, user_id)


def build_invite_url(token: str) -> str:
    """Build the full invite URL."""
    base_url = settings.FRONTEND_HOST.rstrip("/")
    return f"{base_url}/invite/{token}"
