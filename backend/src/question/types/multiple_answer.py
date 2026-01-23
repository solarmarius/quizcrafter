"""Multiple Answer Question type implementation (select all that apply)."""

import uuid
from typing import Any

from pydantic import Field, field_validator, model_validator

from src.canvas.constants import CanvasInteractionType, CanvasScoringAlgorithm

from .base import (
    BaseQuestionData,
    BaseQuestionType,
    QuestionType,
    generate_canvas_title,
)


class MultipleAnswerData(BaseQuestionData):
    """Data model for multiple answer questions (select all that apply)."""

    option_a: str = Field(min_length=1, max_length=500, description="Option A text")
    option_b: str = Field(min_length=1, max_length=500, description="Option B text")
    option_c: str = Field(min_length=1, max_length=500, description="Option C text")
    option_d: str = Field(min_length=1, max_length=500, description="Option D text")
    option_e: str = Field(min_length=1, max_length=500, description="Option E text")
    correct_answers: list[str] = Field(
        description="List of correct answer letters (A, B, C, D, E). Must have 2-4 correct answers."
    )

    @field_validator("correct_answers", mode="before")
    @classmethod
    def validate_correct_answers(cls, v: list[str]) -> list[str]:
        """Validate that correct answers are valid letters."""
        if not isinstance(v, list):
            raise ValueError("correct_answers must be a list")

        valid_letters = {"A", "B", "C", "D", "E"}
        for answer in v:
            if answer not in valid_letters:
                raise ValueError(
                    f"Correct answer must be one of A, B, C, D, E. Got: {answer}"
                )

        # Remove duplicates and sort
        unique_answers = sorted(set(v))
        return unique_answers

    @model_validator(mode="after")
    def validate_answer_count(self) -> "MultipleAnswerData":
        """Validate that there are 2-4 correct answers."""
        if len(self.correct_answers) < 2:
            raise ValueError("Must have at least 2 correct answers")
        if len(self.correct_answers) > 4:
            raise ValueError("Must have at most 4 correct answers")
        return self

    def get_correct_options_text(self) -> list[str]:
        """Get the text of all correct options."""
        option_map = self.get_all_options()
        return [option_map[letter] for letter in self.correct_answers]

    def get_all_options(self) -> dict[str, str]:
        """Get all options as a dictionary."""
        return {
            "A": self.option_a,
            "B": self.option_b,
            "C": self.option_c,
            "D": self.option_d,
            "E": self.option_e,
        }


class MultipleAnswerQuestionType(BaseQuestionType):
    """Implementation for multiple answer questions (select all that apply)."""

    @property
    def question_type(self) -> QuestionType:
        """Return the question type enum."""
        return QuestionType.MULTIPLE_ANSWER

    @property
    def data_model(self) -> type[MultipleAnswerData]:
        """Return the data model class for multiple answer questions."""
        return MultipleAnswerData

    def validate_data(self, data: dict[str, Any]) -> MultipleAnswerData:
        """
        Validate and parse multiple answer question data.

        Args:
            data: Raw question data dictionary

        Returns:
            Validated multiple answer data

        Raises:
            ValidationError: If data is invalid
        """
        return MultipleAnswerData(**data)

    def format_for_display(self, data: BaseQuestionData) -> dict[str, Any]:
        """
        Format multiple answer data for API display.

        Args:
            data: Validated multiple answer data

        Returns:
            Dictionary formatted for frontend display
        """
        if not isinstance(data, MultipleAnswerData):
            raise ValueError("Expected MultipleAnswerData")

        return {
            "question_text": data.question_text,
            "options": data.get_all_options(),
            "correct_answers": data.correct_answers,
            "explanation": data.explanation,
            "question_type": self.question_type.value,
        }

    def format_for_canvas(self, data: BaseQuestionData) -> dict[str, Any]:
        """
        Format multiple answer data for Canvas New Quizzes export.

        Args:
            data: Validated multiple answer data

        Returns:
            Dictionary formatted for Canvas New Quizzes API
        """
        if not isinstance(data, MultipleAnswerData):
            raise ValueError("Expected MultipleAnswerData")

        # Map correct answer letters to indices
        letter_to_index = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}

        # Generate UUIDs for each choice (Canvas New Quizzes API requirement)
        choice_options = [
            data.option_a,
            data.option_b,
            data.option_c,
            data.option_d,
            data.option_e,
        ]
        choice_uuids = [str(uuid.uuid4()) for _ in choice_options]

        # Build choices array for Canvas
        choices = [
            {
                "id": choice_uuids[i],
                "position": i + 1,
                "item_body": f"<p>{choice}</p>",
            }
            for i, choice in enumerate(choice_options)
        ]

        # Get UUIDs of correct answers (array for multi-answer)
        correct_uuids = [
            choice_uuids[letter_to_index[letter]] for letter in data.correct_answers
        ]

        # Wrap question text in paragraph tag if not already wrapped
        item_body = data.question_text
        if not item_body.strip().startswith("<p>"):
            item_body = f"<p>{item_body}</p>"

        return {
            "title": generate_canvas_title(data.question_text),
            "item_body": item_body,
            "calculator_type": "none",
            "interaction_data": {"choices": choices},
            "properties": {
                "shuffle_rules": {"choices": {"shuffled": True}},
            },
            "scoring_data": {"value": correct_uuids},  # Array of UUIDs for multi-answer
            "scoring_algorithm": CanvasScoringAlgorithm.ALL_OR_NOTHING,
            "interaction_type_slug": CanvasInteractionType.MULTI_ANSWER,
            "feedback": {"neutral": data.explanation} if data.explanation else {},
            "points_possible": 1,
        }

    def format_for_export(self, data: BaseQuestionData) -> dict[str, Any]:
        """
        Format multiple answer data for generic export.

        Args:
            data: Validated multiple answer data

        Returns:
            Dictionary with multiple answer data for export
        """
        if not isinstance(data, MultipleAnswerData):
            raise ValueError("Expected MultipleAnswerData")

        return {
            "question_text": data.question_text,
            "option_a": data.option_a,
            "option_b": data.option_b,
            "option_c": data.option_c,
            "option_d": data.option_d,
            "option_e": data.option_e,
            "correct_answers": data.correct_answers,
            "explanation": data.explanation,
            "question_type": self.question_type.value,
        }
