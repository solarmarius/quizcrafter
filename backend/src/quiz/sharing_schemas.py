"""Schemas for quiz sharing functionality."""

from datetime import datetime
from uuid import UUID

from pydantic import Field
from sqlmodel import SQLModel


class QuizInviteCreate(SQLModel):
    """Schema for creating a quiz invite."""

    expires_in_days: int | None = Field(
        default=7,
        ge=1,
        le=30,
        description="Days until expiration, null for no expiration",
    )
    max_uses: int | None = Field(
        default=None, ge=1, le=100, description="Max uses, null for unlimited"
    )


class QuizInviteResponse(SQLModel):
    """Response schema for quiz invite."""

    id: UUID
    token: str
    invite_url: str
    quiz_id: UUID
    quiz_title: str
    created_at: datetime | None
    expires_at: datetime | None
    max_uses: int | None
    use_count: int
    is_revoked: bool


class CollaboratorResponse(SQLModel):
    """Response schema for a collaborator."""

    id: UUID
    user_id: UUID
    user_name: str | None
    added_at: datetime | None


class QuizCollaboratorsResponse(SQLModel):
    """Response schema for quiz collaborators list."""

    quiz_id: UUID
    owner_id: UUID | None
    owner_name: str | None
    collaborators: list[CollaboratorResponse]
    active_invites: list[QuizInviteResponse]


class AcceptInviteResponse(SQLModel):
    """Response when accepting an invite."""

    success: bool
    quiz_id: UUID
    quiz_title: str
    message: str


class InviteInfoResponse(SQLModel):
    """Public invite info (without accepting)."""

    quiz_title: str
    owner_name: str | None
    is_valid: bool
    message: str | None = None
