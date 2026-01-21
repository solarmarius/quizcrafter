"""Tests for quiz sharing functionality."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import Session

from src.quiz.models import Quiz, QuizCollaborator, QuizInvite
from src.quiz.sharing_service import (
    InviteAlreadyExistsError,
    accept_quiz_invite,
    build_invite_url,
    can_access_quiz,
    create_quiz_invite,
    generate_invite_token,
    get_active_invites,
    get_invite_by_token,
    get_quiz_collaborators,
    has_active_invite,
    is_collaborator,
    remove_collaborator,
    revoke_invite,
    validate_invite,
)
from tests.conftest import create_quiz_in_session, create_user_in_session

# ========== Fixtures ==========


@pytest.fixture
def second_user(session: Session):
    """Create a second test user for collaboration tests."""
    return create_user_in_session(session, canvas_id=99999, name="Second User")


@pytest.fixture
def quiz_owner_and_quiz(session: Session):
    """Create a quiz owner and their quiz."""
    owner = create_user_in_session(session, name="Quiz Owner")
    quiz = create_quiz_in_session(session, owner=owner, title="Test Quiz")
    return owner, quiz


# ========== Token Generation Tests ==========


def test_generate_invite_token_returns_43_chars():
    """Token should be 43 characters (base64url encoded 32 bytes)."""
    token = generate_invite_token()
    assert len(token) == 43


def test_generate_invite_token_is_url_safe():
    """Token should only contain URL-safe characters."""
    token = generate_invite_token()
    # URL-safe base64 uses only alphanumeric, hyphen, and underscore
    import re

    assert re.match(r"^[A-Za-z0-9_-]+$", token)


def test_generate_invite_token_unique():
    """Each generated token should be unique."""
    tokens = {generate_invite_token() for _ in range(100)}
    assert len(tokens) == 100


# ========== Invite Creation Tests ==========


def test_create_invite_with_expiration(session: Session, quiz_owner_and_quiz):
    """Create invite with expires_in_days should set expires_at."""
    owner, quiz = quiz_owner_and_quiz

    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    assert invite.id is not None
    assert invite.quiz_id == quiz.id
    assert invite.created_by_id == owner.id
    assert invite.expires_at is not None
    assert invite.is_revoked is False
    assert invite.use_count == 0

    # Check expiration is roughly 7 days from now
    expected = datetime.now(timezone.utc) + timedelta(days=7)
    assert abs((invite.expires_at - expected).total_seconds()) < 60


def test_create_invite_without_expiration(session: Session, quiz_owner_and_quiz):
    """Create invite with expires_in_days=None should have no expiration."""
    owner, quiz = quiz_owner_and_quiz

    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=None)

    assert invite.expires_at is None


def test_create_invite_with_max_uses(session: Session, quiz_owner_and_quiz):
    """Create invite with max_uses should set the limit."""
    owner, quiz = quiz_owner_and_quiz

    invite = create_quiz_invite(session, quiz, owner.id, max_uses=5)

    assert invite.max_uses == 5


def test_create_invite_without_max_uses(session: Session, quiz_owner_and_quiz):
    """Create invite with max_uses=None should be unlimited."""
    owner, quiz = quiz_owner_and_quiz

    invite = create_quiz_invite(session, quiz, owner.id, max_uses=None)

    assert invite.max_uses is None


# ========== Invite Retrieval Tests ==========


def test_get_invite_by_token_found(session: Session, quiz_owner_and_quiz):
    """Get invite by valid token should return the invite."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    found = get_invite_by_token(session, invite.token)

    assert found is not None
    assert found.id == invite.id


def test_get_invite_by_token_not_found(session: Session):
    """Get invite by invalid token should return None."""
    found = get_invite_by_token(session, "nonexistent_token")

    assert found is None


# ========== Invite Validation Tests ==========


def test_validate_invite_valid(session: Session, quiz_owner_and_quiz):
    """Valid invite should pass validation."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    is_valid, error = validate_invite(invite)

    assert is_valid is True
    assert error is None


def test_validate_invite_revoked(session: Session, quiz_owner_and_quiz):
    """Revoked invite should fail validation."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)
    invite.is_revoked = True
    session.commit()

    is_valid, error = validate_invite(invite)

    assert is_valid is False
    assert "revoked" in error.lower()


def test_validate_invite_expired(session: Session, quiz_owner_and_quiz):
    """Expired invite should fail validation."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=1)
    # Manually set to expired
    invite.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session.commit()

    is_valid, error = validate_invite(invite)

    assert is_valid is False
    assert "expired" in error.lower()


def test_validate_invite_max_uses_reached(session: Session, quiz_owner_and_quiz):
    """Invite at max uses should fail validation."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id, max_uses=1)
    invite.use_count = 1
    session.commit()

    is_valid, error = validate_invite(invite)

    assert is_valid is False
    assert "maximum" in error.lower()


def test_validate_invite_unlimited_uses(session: Session, quiz_owner_and_quiz):
    """Invite with max_uses=None should pass regardless of use_count."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id, max_uses=None)
    invite.use_count = 1000
    session.commit()

    is_valid, error = validate_invite(invite)

    assert is_valid is True
    assert error is None


# ========== Accept Invite Tests ==========


def test_accept_invite_creates_collaborator(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Accepting invite should create collaborator relationship."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    collaborator, message = accept_quiz_invite(session, invite, second_user.id)

    assert collaborator is not None
    assert collaborator.quiz_id == quiz.id
    assert collaborator.user_id == second_user.id
    assert "access" in message.lower()


def test_accept_invite_increments_use_count(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Accepting invite should increment use_count."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)
    assert invite.use_count == 0

    accept_quiz_invite(session, invite, second_user.id)
    session.refresh(invite)

    assert invite.use_count == 1


def test_accept_invite_owner_returns_success(session: Session, quiz_owner_and_quiz):
    """Owner accepting own invite should return success with message."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    collaborator, message = accept_quiz_invite(session, invite, owner.id)

    assert collaborator is None  # No collaborator created
    assert "own" in message.lower()


def test_accept_invite_already_collaborator_succeeds(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Already a collaborator should return success without duplicate."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    # First acceptance
    accept_quiz_invite(session, invite, second_user.id)

    # Second acceptance
    collaborator, message = accept_quiz_invite(session, invite, second_user.id)

    assert collaborator is not None
    assert "already" in message.lower()

    # Verify only one collaborator record exists
    collaborators = get_quiz_collaborators(session, quiz.id)
    assert len(collaborators) == 1


def test_accept_invite_quiz_not_found(session: Session, quiz_owner_and_quiz):
    """Accepting invite for deleted quiz should return None."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    # Delete the quiz
    session.delete(quiz)
    session.commit()

    new_user = create_user_in_session(session, canvas_id=88888)
    collaborator, message = accept_quiz_invite(session, invite, new_user.id)

    assert collaborator is None
    assert "not found" in message.lower()


# ========== Collaborator Management Tests ==========


def test_get_quiz_collaborators_returns_list(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Get collaborators should return list of collaborators."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)
    accept_quiz_invite(session, invite, second_user.id)

    collaborators = get_quiz_collaborators(session, quiz.id)

    assert len(collaborators) == 1
    assert collaborators[0].user_id == second_user.id


def test_get_quiz_collaborators_empty(session: Session, quiz_owner_and_quiz):
    """Get collaborators for quiz with none should return empty list."""
    _, quiz = quiz_owner_and_quiz

    collaborators = get_quiz_collaborators(session, quiz.id)

    assert collaborators == []


def test_remove_collaborator_success(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Remove collaborator should delete the record."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)
    collaborator, _ = accept_quiz_invite(session, invite, second_user.id)

    result = remove_collaborator(session, quiz.id, collaborator.id)

    assert result is True
    assert get_quiz_collaborators(session, quiz.id) == []


def test_remove_collaborator_wrong_quiz(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Remove collaborator from wrong quiz should fail."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)
    collaborator, _ = accept_quiz_invite(session, invite, second_user.id)

    # Try to remove from a different quiz
    other_quiz = create_quiz_in_session(session, owner=owner, title="Other Quiz")
    result = remove_collaborator(session, other_quiz.id, collaborator.id)

    assert result is False
    # Collaborator should still exist
    assert len(get_quiz_collaborators(session, quiz.id)) == 1


def test_remove_collaborator_not_found(session: Session, quiz_owner_and_quiz):
    """Remove non-existent collaborator should return False."""
    _, quiz = quiz_owner_and_quiz

    result = remove_collaborator(session, quiz.id, uuid.uuid4())

    assert result is False


def test_revoke_invite_success(session: Session, quiz_owner_and_quiz):
    """Revoke invite should set is_revoked=True."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    result = revoke_invite(session, quiz.id, invite.id)
    session.refresh(invite)

    assert result is True
    assert invite.is_revoked is True


def test_revoke_invite_wrong_quiz(session: Session, quiz_owner_and_quiz):
    """Revoke invite from wrong quiz should fail."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    other_quiz = create_quiz_in_session(session, owner=owner, title="Other Quiz")
    result = revoke_invite(session, other_quiz.id, invite.id)

    assert result is False


def test_revoke_invite_not_found(session: Session, quiz_owner_and_quiz):
    """Revoke non-existent invite should return False."""
    _, quiz = quiz_owner_and_quiz

    result = revoke_invite(session, quiz.id, uuid.uuid4())

    assert result is False


# ========== Access Control Tests ==========


def test_is_collaborator_true(session: Session, quiz_owner_and_quiz, second_user):
    """is_collaborator should return True for collaborators."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)
    accept_quiz_invite(session, invite, second_user.id)

    result = is_collaborator(session, quiz.id, second_user.id)

    assert result is True


def test_is_collaborator_false(session: Session, quiz_owner_and_quiz, second_user):
    """is_collaborator should return False for non-collaborators."""
    _, quiz = quiz_owner_and_quiz

    result = is_collaborator(session, quiz.id, second_user.id)

    assert result is False


def test_is_collaborator_false_for_owner(session: Session, quiz_owner_and_quiz):
    """is_collaborator should return False for owner (they're not in collaborators table)."""
    owner, quiz = quiz_owner_and_quiz

    result = is_collaborator(session, quiz.id, owner.id)

    assert result is False


def test_can_access_quiz_as_owner(session: Session, quiz_owner_and_quiz):
    """can_access_quiz should return True for owner."""
    owner, quiz = quiz_owner_and_quiz

    result = can_access_quiz(session, quiz, owner.id)

    assert result is True


def test_can_access_quiz_as_collaborator(
    session: Session, quiz_owner_and_quiz, second_user
):
    """can_access_quiz should return True for collaborator."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)
    accept_quiz_invite(session, invite, second_user.id)

    result = can_access_quiz(session, quiz, second_user.id)

    assert result is True


def test_can_access_quiz_denied(session: Session, quiz_owner_and_quiz, second_user):
    """can_access_quiz should return False for non-owner/non-collaborator."""
    _, quiz = quiz_owner_and_quiz

    result = can_access_quiz(session, quiz, second_user.id)

    assert result is False


# ========== URL Building Tests ==========


def test_build_invite_url(session: Session, quiz_owner_and_quiz):
    """build_invite_url should create correct URL."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    url = build_invite_url(invite.token)

    assert invite.token in url
    assert "/invite/" in url


# ========== Edge Case Tests ==========


def test_collaborator_uniqueness_constraint(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Duplicate collaborator should not be created."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id)

    # First acceptance creates collaborator
    accept_quiz_invite(session, invite, second_user.id)

    # Try to manually add duplicate
    duplicate = QuizCollaborator(quiz_id=quiz.id, user_id=second_user.id)
    session.add(duplicate)

    with pytest.raises(Exception):  # Should raise IntegrityError
        session.commit()

    session.rollback()


def test_invite_with_no_expiration_is_always_valid(
    session: Session, quiz_owner_and_quiz
):
    """Invite without expiration should remain valid indefinitely."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=None)

    # Even with high use count (if unlimited), should be valid
    invite.use_count = 9999
    session.commit()

    is_valid, error = validate_invite(invite)

    assert is_valid is True
    assert error is None


# ========== One Active Invite Constraint Tests ==========


def test_has_active_invite_true(session: Session, quiz_owner_and_quiz):
    """has_active_invite should return True when active invite exists."""
    owner, quiz = quiz_owner_and_quiz
    create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    result = has_active_invite(session, quiz.id)

    assert result is True


def test_has_active_invite_false_no_invites(session: Session, quiz_owner_and_quiz):
    """has_active_invite should return False when no invites exist."""
    _, quiz = quiz_owner_and_quiz

    result = has_active_invite(session, quiz.id)

    assert result is False


def test_has_active_invite_false_all_revoked(session: Session, quiz_owner_and_quiz):
    """has_active_invite should return False when all invites are revoked."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=7)
    invite.is_revoked = True
    session.commit()

    result = has_active_invite(session, quiz.id)

    assert result is False


def test_has_active_invite_false_all_expired(session: Session, quiz_owner_and_quiz):
    """has_active_invite should return False when all invites are expired."""
    owner, quiz = quiz_owner_and_quiz
    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=1)
    invite.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session.commit()

    result = has_active_invite(session, quiz.id)

    assert result is False


def test_create_invite_fails_when_active_exists(session: Session, quiz_owner_and_quiz):
    """Creating invite should fail if quiz already has an active invite."""
    owner, quiz = quiz_owner_and_quiz

    # First invite succeeds
    create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    # Second invite should fail
    with pytest.raises(InviteAlreadyExistsError) as exc_info:
        create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    assert "already has an active invite" in str(exc_info.value)


def test_create_invite_succeeds_after_revoke(session: Session, quiz_owner_and_quiz):
    """Creating invite should succeed after revoking existing invite."""
    owner, quiz = quiz_owner_and_quiz

    # Create first invite
    first_invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    # Revoke it
    revoke_invite(session, quiz.id, first_invite.id)

    # Second invite should succeed
    second_invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    assert second_invite.id != first_invite.id
    assert second_invite.is_revoked is False


def test_create_invite_succeeds_after_expiration(session: Session, quiz_owner_and_quiz):
    """Creating invite should succeed after existing invite expires."""
    owner, quiz = quiz_owner_and_quiz

    # Create first invite and expire it
    first_invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=1)
    first_invite.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session.commit()

    # Second invite should succeed
    second_invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=7)

    assert second_invite.id != first_invite.id


# ========== Quiz Soft-Delete Cleanup Tests ==========


def test_soft_delete_quiz_cleans_up_invites_and_collaborators(
    session: Session, quiz_owner_and_quiz, second_user
):
    """Soft-deleting a quiz should delete all invites and collaborators."""
    from sqlmodel import select

    from src.quiz.service import delete_quiz

    owner, quiz = quiz_owner_and_quiz
    quiz_id = quiz.id

    # Create an invite
    invite = create_quiz_invite(session, quiz, owner.id, expires_in_days=7)
    invite_id = invite.id

    # Accept the invite to create a collaborator
    collaborator, _ = accept_quiz_invite(session, invite, second_user.id)
    collaborator_id = collaborator.id

    # Verify invite and collaborator exist
    assert session.get(QuizInvite, invite_id) is not None
    assert session.get(QuizCollaborator, collaborator_id) is not None

    # Soft-delete the quiz
    result = delete_quiz(session, quiz_id, owner.id)
    assert result is True

    # Verify invite and collaborator are deleted
    assert session.get(QuizInvite, invite_id) is None
    assert session.get(QuizCollaborator, collaborator_id) is None

    # Verify quiz still exists (soft-deleted)
    quiz_check = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    assert quiz_check is not None
    assert quiz_check.deleted is True
