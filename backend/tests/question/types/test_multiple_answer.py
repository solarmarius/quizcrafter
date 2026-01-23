"""Tests for Multiple Answer Question type implementation."""

import re
import uuid

import pytest


def test_multiple_answer_data_creation():
    """Test creating MultipleAnswerData with valid data."""
    from src.question.types.multiple_answer import MultipleAnswerData

    data = MultipleAnswerData(
        question_text="Which of the following are European capitals?",
        option_a="Paris",
        option_b="London",
        option_c="Sydney",
        option_d="Berlin",
        option_e="Tokyo",
        correct_answers=["A", "B", "D"],
        explanation="Paris, London, and Berlin are European capitals.",
    )
    assert data.question_text == "Which of the following are European capitals?"
    assert data.option_a == "Paris"
    assert data.option_b == "London"
    assert data.option_c == "Sydney"
    assert data.option_d == "Berlin"
    assert data.option_e == "Tokyo"
    assert data.correct_answers == ["A", "B", "D"]
    assert data.explanation == "Paris, London, and Berlin are European capitals."


def test_multiple_answer_data_minimal():
    """Test MultipleAnswerData with minimal required fields (2 correct answers)."""
    from src.question.types.multiple_answer import MultipleAnswerData

    data = MultipleAnswerData(
        question_text="Which are even numbers?",
        option_a="2",
        option_b="3",
        option_c="4",
        option_d="5",
        option_e="7",
        correct_answers=["A", "C"],
    )
    assert data.explanation is None
    assert data.correct_answers == ["A", "C"]


def test_multiple_answer_data_four_correct():
    """Test MultipleAnswerData with 4 correct answers (maximum)."""
    from src.question.types.multiple_answer import MultipleAnswerData

    data = MultipleAnswerData(
        question_text="Which are programming languages?",
        option_a="Python",
        option_b="Java",
        option_c="Spreadsheet",
        option_d="JavaScript",
        option_e="Ruby",
        correct_answers=["A", "B", "D", "E"],
    )
    assert len(data.correct_answers) == 4
    assert data.correct_answers == ["A", "B", "D", "E"]


def test_multiple_answer_data_question_text_validation():
    """Test question text validation."""
    from pydantic import ValidationError

    from src.question.types.multiple_answer import MultipleAnswerData

    # Valid question text
    MultipleAnswerData(
        question_text="Valid question?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B"],
    )

    # Empty question text
    with pytest.raises(ValidationError) as exc_info:
        MultipleAnswerData(
            question_text="",
            option_a="A",
            option_b="B",
            option_c="C",
            option_d="D",
            option_e="E",
            correct_answers=["A", "B"],
        )
    assert "String should have at least 1 character" in str(exc_info.value)

    # Question text too long
    long_text = "x" * 2001
    with pytest.raises(ValidationError) as exc_info:
        MultipleAnswerData(
            question_text=long_text,
            option_a="A",
            option_b="B",
            option_c="C",
            option_d="D",
            option_e="E",
            correct_answers=["A", "B"],
        )
    assert "String should have at most 2000 characters" in str(exc_info.value)


def test_multiple_answer_data_option_validation():
    """Test option validation for all 5 options."""
    from pydantic import ValidationError

    from src.question.types.multiple_answer import MultipleAnswerData

    # Valid options
    MultipleAnswerData(
        question_text="Test?",
        option_a="Option A",
        option_b="Option B",
        option_c="Option C",
        option_d="Option D",
        option_e="Option E",
        correct_answers=["A", "B"],
    )

    # Test empty options for each option
    options_to_test = ["a", "b", "c", "d", "e"]
    for opt in options_to_test:
        kwargs = {
            "question_text": "Test?",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "option_e": "E",
            "correct_answers": ["A", "B"],
        }
        kwargs[f"option_{opt}"] = ""
        with pytest.raises(ValidationError) as exc_info:
            MultipleAnswerData(**kwargs)
        assert "String should have at least 1 character" in str(exc_info.value)


def test_multiple_answer_data_option_length_validation():
    """Test option length validation."""
    from pydantic import ValidationError

    from src.question.types.multiple_answer import MultipleAnswerData

    # Valid max length option
    max_option = "x" * 500
    MultipleAnswerData(
        question_text="Test?",
        option_a=max_option,
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B"],
    )

    # Test option too long for each option
    long_option = "x" * 501
    options_to_test = ["a", "b", "c", "d", "e"]
    for opt in options_to_test:
        kwargs = {
            "question_text": "Test?",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "option_e": "E",
            "correct_answers": ["A", "B"],
        }
        kwargs[f"option_{opt}"] = long_option
        with pytest.raises(ValidationError) as exc_info:
            MultipleAnswerData(**kwargs)
        assert "String should have at most 500 characters" in str(exc_info.value)


def test_multiple_answer_data_correct_answers_validation():
    """Test correct answers validation."""
    from pydantic import ValidationError

    from src.question.types.multiple_answer import MultipleAnswerData

    # Valid correct answers - various combinations
    valid_combinations = [
        ["A", "B"],
        ["A", "C"],
        ["B", "D"],
        ["A", "B", "C"],
        ["A", "C", "E"],
        ["A", "B", "C", "D"],
        ["B", "C", "D", "E"],
    ]
    for answers in valid_combinations:
        MultipleAnswerData(
            question_text="Test?",
            option_a="A",
            option_b="B",
            option_c="C",
            option_d="D",
            option_e="E",
            correct_answers=answers,
        )

    # Invalid: Only 1 correct answer
    with pytest.raises(ValidationError) as exc_info:
        MultipleAnswerData(
            question_text="Test?",
            option_a="A",
            option_b="B",
            option_c="C",
            option_d="D",
            option_e="E",
            correct_answers=["A"],
        )
    assert "Must have at least 2 correct answers" in str(exc_info.value)

    # Invalid: 5 correct answers (all options)
    with pytest.raises(ValidationError) as exc_info:
        MultipleAnswerData(
            question_text="Test?",
            option_a="A",
            option_b="B",
            option_c="C",
            option_d="D",
            option_e="E",
            correct_answers=["A", "B", "C", "D", "E"],
        )
    assert "Must have at most 4 correct answers" in str(exc_info.value)

    # Invalid: Empty array
    with pytest.raises(ValidationError) as exc_info:
        MultipleAnswerData(
            question_text="Test?",
            option_a="A",
            option_b="B",
            option_c="C",
            option_d="D",
            option_e="E",
            correct_answers=[],
        )
    assert "Must have at least 2 correct answers" in str(exc_info.value)


def test_multiple_answer_data_invalid_answer_letters():
    """Test that invalid answer letters are rejected."""
    from pydantic import ValidationError

    from src.question.types.multiple_answer import MultipleAnswerData

    invalid_answers_list = [
        ["A", "F"],  # F is invalid
        ["A", "1"],  # 1 is invalid
        ["a", "b"],  # lowercase not allowed
        ["A", "AB"],  # AB is invalid
    ]
    for invalid_answers in invalid_answers_list:
        with pytest.raises(ValidationError) as exc_info:
            MultipleAnswerData(
                question_text="Test?",
                option_a="A",
                option_b="B",
                option_c="C",
                option_d="D",
                option_e="E",
                correct_answers=invalid_answers,
            )
        assert "Correct answer must be one of A, B, C, D, E" in str(exc_info.value)


def test_multiple_answer_data_duplicate_removal():
    """Test that duplicate correct answers are removed and sorted."""
    from src.question.types.multiple_answer import MultipleAnswerData

    data = MultipleAnswerData(
        question_text="Test?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["C", "A", "C", "B", "A"],  # Duplicates and unsorted
    )
    # Should be deduplicated and sorted
    assert data.correct_answers == ["A", "B", "C"]


def test_multiple_answer_data_explanation_validation():
    """Test explanation validation."""
    from pydantic import ValidationError

    from src.question.types.multiple_answer import MultipleAnswerData

    # Valid explanation
    MultipleAnswerData(
        question_text="Test?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B"],
        explanation="This is a valid explanation.",
    )

    # No explanation (should be allowed)
    MultipleAnswerData(
        question_text="Test?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B"],
    )

    # Explanation too long
    long_explanation = "x" * 1001
    with pytest.raises(ValidationError) as exc_info:
        MultipleAnswerData(
            question_text="Test?",
            option_a="A",
            option_b="B",
            option_c="C",
            option_d="D",
            option_e="E",
            correct_answers=["A", "B"],
            explanation=long_explanation,
        )
    assert "String should have at most 1000 characters" in str(exc_info.value)


def test_multiple_answer_data_get_correct_options_text():
    """Test getting correct options text."""
    from src.question.types.multiple_answer import MultipleAnswerData

    data = MultipleAnswerData(
        question_text="Which are European capitals?",
        option_a="Paris",
        option_b="London",
        option_c="Sydney",
        option_d="Berlin",
        option_e="Tokyo",
        correct_answers=["A", "B", "D"],
    )
    correct_texts = data.get_correct_options_text()
    assert correct_texts == ["Paris", "London", "Berlin"]


def test_multiple_answer_data_get_all_options():
    """Test getting all options dictionary."""
    from src.question.types.multiple_answer import MultipleAnswerData

    data = MultipleAnswerData(
        question_text="Test?",
        option_a="Paris",
        option_b="London",
        option_c="Sydney",
        option_d="Berlin",
        option_e="Tokyo",
        correct_answers=["A", "B"],
    )

    expected = {
        "A": "Paris",
        "B": "London",
        "C": "Sydney",
        "D": "Berlin",
        "E": "Tokyo",
    }
    assert data.get_all_options() == expected


def test_multiple_answer_question_type_properties():
    """Test MultipleAnswerQuestionType properties."""
    from src.question.types import QuestionType
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    assert question_type.question_type == QuestionType.MULTIPLE_ANSWER
    assert question_type.data_model == MultipleAnswerData


def test_multiple_answer_question_type_validate_data():
    """Test data validation in MultipleAnswerQuestionType."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = {
        "question_text": "Which are prime numbers?",
        "option_a": "2",
        "option_b": "3",
        "option_c": "4",
        "option_d": "5",
        "option_e": "6",
        "correct_answers": ["A", "B", "D"],
        "explanation": "2, 3, and 5 are prime numbers.",
    }

    result = question_type.validate_data(data)
    assert isinstance(result, MultipleAnswerData)
    assert result.question_text == "Which are prime numbers?"
    assert result.option_a == "2"
    assert result.correct_answers == ["A", "B", "D"]
    assert result.explanation == "2, 3, and 5 are prime numbers."


def test_multiple_answer_question_type_validate_invalid_data():
    """Test validation of invalid data."""
    from pydantic import ValidationError

    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    question_type = MultipleAnswerQuestionType()

    # Missing required fields
    with pytest.raises(ValidationError):
        question_type.validate_data({"question_text": "Test?"})

    # Only 1 correct answer
    with pytest.raises(ValidationError):
        question_type.validate_data(
            {
                "question_text": "Test?",
                "option_a": "A",
                "option_b": "B",
                "option_c": "C",
                "option_d": "D",
                "option_e": "E",
                "correct_answers": ["A"],
            }
        )

    # Invalid answer letter
    with pytest.raises(ValidationError):
        question_type.validate_data(
            {
                "question_text": "Test?",
                "option_a": "A",
                "option_b": "B",
                "option_c": "C",
                "option_d": "D",
                "option_e": "E",
                "correct_answers": ["A", "F"],
            }
        )


def test_multiple_answer_question_type_format_for_display():
    """Test formatting for display."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Which are European capitals?",
        option_a="Paris",
        option_b="London",
        option_c="Sydney",
        option_d="Berlin",
        option_e="Tokyo",
        correct_answers=["A", "B", "D"],
        explanation="Paris, London, and Berlin are European capitals.",
    )

    result = question_type.format_for_display(data)
    expected = {
        "question_text": "Which are European capitals?",
        "options": {
            "A": "Paris",
            "B": "London",
            "C": "Sydney",
            "D": "Berlin",
            "E": "Tokyo",
        },
        "correct_answers": ["A", "B", "D"],
        "explanation": "Paris, London, and Berlin are European capitals.",
        "question_type": "multiple_answer",
    }
    assert result == expected


def test_multiple_answer_question_type_format_for_display_no_explanation():
    """Test formatting for display without explanation."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Which are even?",
        option_a="2",
        option_b="3",
        option_c="4",
        option_d="5",
        option_e="6",
        correct_answers=["A", "C", "E"],
    )

    result = question_type.format_for_display(data)
    assert result["explanation"] is None
    assert result["correct_answers"] == ["A", "C", "E"]


def test_multiple_answer_question_type_format_for_display_wrong_type():
    """Test formatting for display with wrong data type."""
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    question_type = MultipleAnswerQuestionType()

    with pytest.raises(ValueError, match="Expected MultipleAnswerData"):
        question_type.format_for_display("wrong_type")


def test_multiple_answer_question_type_format_for_canvas():
    """Test Canvas export formatting."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Which are European capitals?",
        option_a="Paris",
        option_b="London",
        option_c="Sydney",
        option_d="Berlin",
        option_e="Tokyo",
        correct_answers=["A", "B", "D"],
    )

    result = question_type.format_for_canvas(data)

    # Validate basic structure
    assert "title" in result
    assert result["item_body"] == "<p>Which are European capitals?</p>"
    assert result["calculator_type"] == "none"
    assert result["interaction_type_slug"] == "multi-answer"
    assert result["scoring_algorithm"] == "AllOrNothing"
    assert result["points_possible"] == 1

    # Validate interaction_data
    interaction_data = result["interaction_data"]
    assert "choices" in interaction_data
    assert len(interaction_data["choices"]) == 5

    # Check choice structure and validate UUIDs
    choices = interaction_data["choices"]
    uuid_pattern = (
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    )

    # Validate all choices
    expected_content = ["Paris", "London", "Sydney", "Berlin", "Tokyo"]
    for i, choice in enumerate(choices):
        assert re.match(uuid_pattern, choice["id"]), f"Choice {i} ID should be UUID"
        assert choice["position"] == i + 1
        assert choice["item_body"] == f"<p>{expected_content[i]}</p>"

    # Validate scoring data is an array of UUIDs (for multi-answer)
    scoring_value = result["scoring_data"]["value"]
    assert isinstance(scoring_value, list), "scoring_data.value should be an array"
    assert len(scoring_value) == 3, "Should have 3 correct answer UUIDs"

    # Validate correct UUIDs are in scoring_data (A=0, B=1, D=3)
    assert scoring_value[0] == choices[0]["id"]  # A
    assert scoring_value[1] == choices[1]["id"]  # B
    assert scoring_value[2] == choices[3]["id"]  # D

    # Validate all scoring values are valid UUIDs
    for uuid_val in scoring_value:
        assert re.match(uuid_pattern, uuid_val)

    # Validate properties
    properties = result["properties"]
    assert properties["shuffle_rules"]["choices"]["shuffled"] is True

    # Validate feedback - should be empty when no explanation
    assert result["feedback"] == {}


def test_multiple_answer_question_type_format_for_canvas_uuid_compliance():
    """Test that Canvas formatting uses proper UUIDs as per Canvas New Quizzes API."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Which languages are used for web development?",
        option_a="JavaScript",
        option_b="Python",
        option_c="Java",
        option_d="HTML",
        option_e="CSS",
        correct_answers=["A", "D", "E"],
    )

    result = question_type.format_for_canvas(data)

    # Validate that all choice IDs are proper UUIDs (Version 4)
    uuid_pattern = (
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    )
    choices = result["interaction_data"]["choices"]

    assert len(choices) == 5
    choice_ids = []
    for i, choice in enumerate(choices):
        choice_id = choice["id"]
        choice_ids.append(choice_id)
        # Validate UUID format
        assert re.match(
            uuid_pattern, choice_id
        ), f"Choice {i} ID '{choice_id}' is not a valid UUID4"
        # Validate UUID can be parsed
        uuid.UUID(choice_id)  # Should not raise exception
        # Validate position is correct
        assert choice["position"] == i + 1

    # Validate all UUIDs are unique
    assert len(set(choice_ids)) == 5, "All choice UUIDs should be unique"

    # Validate scoring data uses correct choice UUIDs (A=0, D=3, E=4)
    scoring_value = result["scoring_data"]["value"]
    assert len(scoring_value) == 3
    assert scoring_value[0] == choice_ids[0]  # A
    assert scoring_value[1] == choice_ids[3]  # D
    assert scoring_value[2] == choice_ids[4]  # E


def test_multiple_answer_question_type_format_for_canvas_different_answer_counts():
    """Test Canvas formatting with different numbers of correct answers."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()

    # Test 2 correct answers
    data_2 = MultipleAnswerData(
        question_text="Test 2?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "E"],
    )
    result_2 = question_type.format_for_canvas(data_2)
    choices_2 = result_2["interaction_data"]["choices"]
    assert len(result_2["scoring_data"]["value"]) == 2
    assert result_2["scoring_data"]["value"][0] == choices_2[0]["id"]  # A
    assert result_2["scoring_data"]["value"][1] == choices_2[4]["id"]  # E

    # Test 3 correct answers
    data_3 = MultipleAnswerData(
        question_text="Test 3?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["B", "C", "D"],
    )
    result_3 = question_type.format_for_canvas(data_3)
    choices_3 = result_3["interaction_data"]["choices"]
    assert len(result_3["scoring_data"]["value"]) == 3
    assert result_3["scoring_data"]["value"][0] == choices_3[1]["id"]  # B
    assert result_3["scoring_data"]["value"][1] == choices_3[2]["id"]  # C
    assert result_3["scoring_data"]["value"][2] == choices_3[3]["id"]  # D

    # Test 4 correct answers
    data_4 = MultipleAnswerData(
        question_text="Test 4?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B", "C", "D"],
    )
    result_4 = question_type.format_for_canvas(data_4)
    choices_4 = result_4["interaction_data"]["choices"]
    assert len(result_4["scoring_data"]["value"]) == 4
    for i in range(4):
        assert result_4["scoring_data"]["value"][i] == choices_4[i]["id"]


def test_multiple_answer_question_type_format_for_canvas_html_wrapping():
    """Test Canvas formatting HTML wrapping behavior."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()

    # Question text without HTML tags
    data = MultipleAnswerData(
        question_text="Plain text question",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B"],
    )
    result = question_type.format_for_canvas(data)
    assert result["item_body"] == "<p>Plain text question</p>"

    # Question text already with HTML tags
    data_html = MultipleAnswerData(
        question_text="<p>Already wrapped question</p>",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B"],
    )
    result_html = question_type.format_for_canvas(data_html)
    assert result_html["item_body"] == "<p>Already wrapped question</p>"


def test_multiple_answer_question_type_format_for_canvas_wrong_type():
    """Test Canvas formatting with wrong data type."""
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    question_type = MultipleAnswerQuestionType()

    with pytest.raises(ValueError, match="Expected MultipleAnswerData"):
        question_type.format_for_canvas("wrong_type")


def test_multiple_answer_question_type_format_for_canvas_with_explanation():
    """Test Canvas export formatting with explanation."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Which are European capitals?",
        option_a="Paris",
        option_b="London",
        option_c="Sydney",
        option_d="Berlin",
        option_e="Tokyo",
        correct_answers=["A", "B", "D"],
        explanation="Paris (France), London (UK), and Berlin (Germany) are European.",
    )

    result = question_type.format_for_canvas(data)

    # Validate feedback contains explanation
    assert "feedback" in result
    assert "neutral" in result["feedback"]
    assert (
        result["feedback"]["neutral"]
        == "Paris (France), London (UK), and Berlin (Germany) are European."
    )


def test_multiple_answer_question_type_format_for_canvas_empty_explanation():
    """Test Canvas export formatting with empty string explanation."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Test?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "B"],
        explanation="",
    )

    result = question_type.format_for_canvas(data)

    # Validate feedback is empty dict when explanation is empty string
    assert result["feedback"] == {}


def test_multiple_answer_question_type_format_for_export():
    """Test generic export formatting."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Which are European capitals?",
        option_a="Paris",
        option_b="London",
        option_c="Sydney",
        option_d="Berlin",
        option_e="Tokyo",
        correct_answers=["A", "B", "D"],
        explanation="Paris, London, and Berlin are European capitals.",
    )

    result = question_type.format_for_export(data)
    expected = {
        "question_text": "Which are European capitals?",
        "option_a": "Paris",
        "option_b": "London",
        "option_c": "Sydney",
        "option_d": "Berlin",
        "option_e": "Tokyo",
        "correct_answers": ["A", "B", "D"],
        "explanation": "Paris, London, and Berlin are European capitals.",
        "question_type": "multiple_answer",
    }
    assert result == expected


def test_multiple_answer_question_type_format_for_export_no_explanation():
    """Test export formatting without explanation."""
    from src.question.types.multiple_answer import (
        MultipleAnswerData,
        MultipleAnswerQuestionType,
    )

    question_type = MultipleAnswerQuestionType()
    data = MultipleAnswerData(
        question_text="Test?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        option_e="E",
        correct_answers=["A", "C"],
    )

    result = question_type.format_for_export(data)
    assert result["explanation"] is None
    assert result["correct_answers"] == ["A", "C"]


def test_multiple_answer_question_type_format_for_export_wrong_type():
    """Test export formatting with wrong data type."""
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    question_type = MultipleAnswerQuestionType()

    with pytest.raises(ValueError, match="Expected MultipleAnswerData"):
        question_type.format_for_export("wrong_type")


def test_multiple_answer_registry_registration():
    """Test that multiple answer type is registered."""
    from src.question.types import QuestionType, get_question_type_registry

    registry = get_question_type_registry()
    assert registry.is_registered(QuestionType.MULTIPLE_ANSWER)


def test_multiple_answer_registry_get_question_type():
    """Test getting multiple answer question type from registry."""
    from src.question.types import QuestionType, get_question_type_registry
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    registry = get_question_type_registry()
    question_type = registry.get_question_type(QuestionType.MULTIPLE_ANSWER)
    assert isinstance(question_type, MultipleAnswerQuestionType)


def test_multiple_answer_registry_available_types():
    """Test that available types includes multiple answer."""
    from src.question.types import QuestionType, get_question_type_registry

    registry = get_question_type_registry()
    available_types = registry.get_available_types()
    assert QuestionType.MULTIPLE_ANSWER in available_types


def test_multiple_answer_end_to_end_workflow():
    """Test complete workflow from raw data to Canvas export."""
    from src.question.types import QuestionType, get_question_type_registry

    # Raw AI response data
    raw_data = {
        "question_text": "Which programming languages are object-oriented?",
        "option_a": "Python",
        "option_b": "Java",
        "option_c": "HTML",
        "option_d": "C++",
        "option_e": "CSS",
        "correct_answers": ["A", "B", "D"],
        "explanation": "Python, Java, and C++ support OOP. HTML and CSS are not.",
    }

    # Get question type and validate data
    registry = get_question_type_registry()
    ma_type = registry.get_question_type(QuestionType.MULTIPLE_ANSWER)
    validated_data = ma_type.validate_data(raw_data)

    # Format for different outputs
    display_format = ma_type.format_for_display(validated_data)
    canvas_format = ma_type.format_for_canvas(validated_data)
    export_format = ma_type.format_for_export(validated_data)

    # Validate all formats work
    assert display_format["question_type"] == "multiple_answer"
    assert canvas_format["interaction_type_slug"] == "multi-answer"
    assert export_format["question_type"] == "multiple_answer"

    # Validate data consistency
    assert display_format["correct_answers"] == ["A", "B", "D"]
    # Canvas should use UUID array for correct answers
    choices = canvas_format["interaction_data"]["choices"]
    scoring_values = canvas_format["scoring_data"]["value"]
    assert len(scoring_values) == 3
    assert scoring_values[0] == choices[0]["id"]  # A
    assert scoring_values[1] == choices[1]["id"]  # B
    assert scoring_values[2] == choices[3]["id"]  # D
    assert export_format["correct_answers"] == ["A", "B", "D"]

    # Validate question content consistency
    assert display_format["question_text"] == raw_data["question_text"]
    assert export_format["option_a"] == raw_data["option_a"]


def test_multiple_answer_validation_round_trip():
    """Test that data can be validated and re-validated."""
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    question_type = MultipleAnswerQuestionType()
    original_data = {
        "question_text": "Which are primary colors?",
        "option_a": "Red",
        "option_b": "Green",
        "option_c": "Blue",
        "option_d": "Yellow",
        "option_e": "Orange",
        "correct_answers": ["A", "C", "D"],
        "explanation": "Red, blue, and yellow are primary colors.",
    }

    # Validate and export
    validated = question_type.validate_data(original_data)
    exported = question_type.format_for_export(validated)

    # Remove question_type for re-validation since it's not part of the data model
    exported_for_validation = exported.copy()
    exported_for_validation.pop("question_type", None)

    # Re-validate exported data
    re_validated = question_type.validate_data(exported_for_validation)
    re_exported = question_type.format_for_export(re_validated)

    # Should be identical
    assert exported == re_exported


def test_multiple_answer_complex_validation_scenario():
    """Test complex validation with edge cases and special characters."""
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    # Test with special characters and edge cases
    complex_data = {
        "question_text": "Which equations are correct? (π, e, i)",
        "option_a": "e^(iπ) + 1 = 0",
        "option_b": "sin²(x) + cos²(x) = 1",
        "option_c": "2 + 2 = 5",
        "option_d": "∑(1/n²) = π²/6",
        "option_e": "√(-1) = i",
        "correct_answers": ["A", "B", "D", "E"],
        "explanation": "Euler's identity, Pythagorean identity, Basel problem, imaginary unit.",
    }

    ma_type = MultipleAnswerQuestionType()
    validated_data = ma_type.validate_data(complex_data)

    # Should validate successfully
    assert validated_data.question_text == complex_data["question_text"]
    assert validated_data.correct_answers == ["A", "B", "D", "E"]

    # Canvas export should work with special characters
    canvas_format = ma_type.format_for_canvas(validated_data)
    assert canvas_format["points_possible"] == 1
    assert "π" in canvas_format["item_body"]  # Special characters preserved

    # Display format should work
    display_format = ma_type.format_for_display(validated_data)
    assert "π" in display_format["options"]["A"]


def test_multiple_answer_maximum_length_content():
    """Test with maximum allowed content lengths."""
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    # Create data with maximum allowed lengths
    max_question = "x" * 2000
    max_option = "y" * 500
    max_explanation = "z" * 1000

    max_data = {
        "question_text": max_question,
        "option_a": max_option,
        "option_b": "Short B",
        "option_c": "Short C",
        "option_d": "Short D",
        "option_e": "Short E",
        "correct_answers": ["A", "B"],
        "explanation": max_explanation,
    }

    ma_type = MultipleAnswerQuestionType()
    validated_data = ma_type.validate_data(max_data)

    # Should validate successfully
    assert len(validated_data.question_text) == 2000
    assert len(validated_data.option_a) == 500
    assert len(validated_data.explanation) == 1000

    # All formatting methods should work
    display_format = ma_type.format_for_display(validated_data)
    canvas_format = ma_type.format_for_canvas(validated_data)
    export_format = ma_type.format_for_export(validated_data)

    assert len(display_format["question_text"]) == 2000
    assert len(canvas_format["interaction_data"]["choices"][0]["item_body"]) > 500
    assert len(export_format["explanation"]) == 1000


def test_multiple_answer_all_answer_combinations():
    """Test multiple answer with various correct answer combinations."""
    from src.question.types.multiple_answer import MultipleAnswerQuestionType

    ma_type = MultipleAnswerQuestionType()
    base_data = {
        "question_text": "Test question",
        "option_a": "Option A",
        "option_b": "Option B",
        "option_c": "Option C",
        "option_d": "Option D",
        "option_e": "Option E",
    }

    # Test various combinations
    uuid_pattern = (
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    )
    letter_to_index = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}

    test_combinations = [
        ["A", "B"],
        ["A", "E"],
        ["B", "D"],
        ["C", "D", "E"],
        ["A", "C", "E"],
        ["A", "B", "C", "D"],
    ]

    for correct_answers in test_combinations:
        data = {**base_data, "correct_answers": correct_answers}
        validated_data = ma_type.validate_data(data)

        # Test Canvas format uses UUIDs
        canvas_format = ma_type.format_for_canvas(validated_data)
        choices = canvas_format["interaction_data"]["choices"]
        scoring_values = canvas_format["scoring_data"]["value"]

        # Validate scoring uses the correct choice UUIDs
        assert len(scoring_values) == len(correct_answers)
        for i, answer in enumerate(correct_answers):
            expected_index = letter_to_index[answer]
            assert scoring_values[i] == choices[expected_index]["id"]
            assert re.match(uuid_pattern, scoring_values[i])

        # Test display format
        display_format = ma_type.format_for_display(validated_data)
        assert display_format["correct_answers"] == correct_answers

        # Test get_correct_options_text method
        expected_texts = [f"Option {letter}" for letter in correct_answers]
        assert validated_data.get_correct_options_text() == expected_texts
