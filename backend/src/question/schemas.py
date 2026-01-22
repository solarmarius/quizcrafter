"""Question schemas for validation and serialization with polymorphic support."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from .types import QuestionDifficulty, QuestionType, RejectionReason


class QuestionCreateRequest(BaseModel):
    """Schema for creating a new question."""

    quiz_id: uuid.UUID
    question_type: QuestionType
    question_data: dict[str, Any] = Field(description="Question type-specific data")
    difficulty: QuestionDifficulty | None = None
    tags: list[str] | None = None

    class Config:
        use_enum_values = True


class QuestionUpdateRequest(BaseModel):
    """Schema for updating a question."""

    question_data: dict[str, Any] | None = Field(
        default=None, description="Updated question data"
    )
    difficulty: QuestionDifficulty | None = None
    tags: list[str] | None = None

    class Config:
        use_enum_values = True


class QuestionResponse(BaseModel):
    """Public question schema for API responses."""

    id: uuid.UUID
    quiz_id: uuid.UUID
    question_type: QuestionType
    question_data: dict[str, Any]
    difficulty: QuestionDifficulty | None = None
    tags: list[str] | None = None
    is_approved: bool
    approved_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    canvas_item_id: str | None = None
    module_id: str | None = None
    rejection_reason: str | None = None
    rejection_feedback: str | None = None

    class Config:
        use_enum_values = True


class BulkApproveRequest(BaseModel):
    """Schema for bulk approving multiple questions."""

    question_ids: list[uuid.UUID] = Field(
        ..., min_length=1, max_length=100, description="List of question IDs to approve"
    )

    @field_validator("question_ids")
    @classmethod
    def validate_unique_ids(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        """Ensure all question IDs are unique."""
        if len(v) != len(set(v)):
            raise ValueError("Duplicate question IDs are not allowed")
        return v


class BulkDeleteRequest(BaseModel):
    """Schema for bulk deleting/rejecting multiple questions."""

    question_ids: list[uuid.UUID] = Field(
        ..., min_length=1, max_length=100, description="List of question IDs to delete"
    )
    rejection_reason: RejectionReason | None = Field(
        default=None, description="Reason for rejection (applies to all questions)"
    )
    rejection_feedback: str | None = Field(
        default=None, max_length=500, description="Additional feedback for rejection"
    )

    @field_validator("question_ids")
    @classmethod
    def validate_unique_ids(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        """Ensure all question IDs are unique."""
        if len(v) != len(set(v)):
            raise ValueError("Duplicate question IDs are not allowed")
        return v


class BulkOperationResponse(BaseModel):
    """Response schema for bulk operations."""

    success_count: int = Field(description="Number of questions successfully processed")
    failed_count: int = Field(description="Number of questions that failed to process")
    failed_ids: list[uuid.UUID] = Field(
        default_factory=list, description="IDs of questions that failed"
    )
    message: str = Field(description="Summary message of the operation")
