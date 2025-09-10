"""Tests for Canvas router endpoints."""

from unittest.mock import patch

from src.canvas.schemas import CanvasCourse
from src.config import settings
from tests.test_data import CANVAS_COURSES_WITH_PREFIXES


def test_canvas_course_prefixes_property_empty_string():
    """Test that empty string returns empty list."""
    with patch.object(settings, "CANVAS_COURSE_PREFIX_FILTER", ""):
        assert settings.canvas_course_prefixes == []


def test_canvas_course_prefixes_property_whitespace_only():
    """Test that whitespace-only string returns empty list."""
    with patch.object(settings, "CANVAS_COURSE_PREFIX_FILTER", "   "):
        assert settings.canvas_course_prefixes == []


def test_canvas_course_prefixes_property_single_prefix():
    """Test parsing single prefix."""
    with patch.object(settings, "CANVAS_COURSE_PREFIX_FILTER", "SB_ME_"):
        assert settings.canvas_course_prefixes == ["SB_ME_"]


def test_canvas_course_prefixes_property_multiple_prefixes():
    """Test parsing multiple prefixes."""
    with patch.object(settings, "CANVAS_COURSE_PREFIX_FILTER", "SB_ME_,TK-,INF-"):
        assert settings.canvas_course_prefixes == ["SB_ME_", "TK-", "INF-"]


def test_canvas_course_prefixes_property_with_whitespace():
    """Test parsing prefixes with surrounding whitespace."""
    with patch.object(settings, "CANVAS_COURSE_PREFIX_FILTER", " SB_ME_ , TK- , INF- "):
        assert settings.canvas_course_prefixes == ["SB_ME_", "TK-", "INF-"]


def test_canvas_course_prefixes_property_empty_segments_ignored():
    """Test that empty segments are ignored."""
    with patch.object(settings, "CANVAS_COURSE_PREFIX_FILTER", "SB_ME_,,TK-,"):
        assert settings.canvas_course_prefixes == ["SB_ME_", "TK-"]


def test_course_filtering_logic_no_filter_returns_all():
    """Test course filtering logic with no filter configured."""
    # Convert test data to CanvasCourse objects
    test_courses = [
        CanvasCourse(id=course["id"], name=course["name"])
        for course in CANVAS_COURSES_WITH_PREFIXES
    ]

    # Simulate no filter configured
    prefixes = []

    # Apply the same filtering logic as in the router
    if prefixes:
        filtered_courses = [
            course
            for course in test_courses
            if any(course.name.startswith(prefix) for prefix in prefixes)
        ]
    else:
        filtered_courses = test_courses

    assert len(filtered_courses) == 5
    course_names = [course.name for course in filtered_courses]
    assert "SB_ME_INF-0005 Praktisk kunstig intelligens" in course_names
    assert "Regular Course Without Prefix" in course_names


def test_course_filtering_logic_single_prefix():
    """Test course filtering logic with single prefix."""
    # Convert test data to CanvasCourse objects
    test_courses = [
        CanvasCourse(id=course["id"], name=course["name"])
        for course in CANVAS_COURSES_WITH_PREFIXES
    ]

    # Simulate single prefix filter
    prefixes = ["SB_ME_"]

    # Apply the same filtering logic as in the router
    if prefixes:
        filtered_courses = [
            course
            for course in test_courses
            if any(course.name.startswith(prefix) for prefix in prefixes)
        ]
    else:
        filtered_courses = test_courses

    assert len(filtered_courses) == 1
    assert filtered_courses[0].name == "SB_ME_INF-0005 Praktisk kunstig intelligens"


def test_course_filtering_logic_multiple_prefixes():
    """Test course filtering logic with multiple prefixes."""
    # Convert test data to CanvasCourse objects
    test_courses = [
        CanvasCourse(id=course["id"], name=course["name"])
        for course in CANVAS_COURSES_WITH_PREFIXES
    ]

    # Simulate multiple prefix filters
    prefixes = ["SB_ME_", "TK-", "INF-"]

    # Apply the same filtering logic as in the router
    if prefixes:
        filtered_courses = [
            course
            for course in test_courses
            if any(course.name.startswith(prefix) for prefix in prefixes)
        ]
    else:
        filtered_courses = test_courses

    assert len(filtered_courses) == 3
    course_names = [course.name for course in filtered_courses]
    assert "SB_ME_INF-0005 Praktisk kunstig intelligens" in course_names
    assert "TK-8110 Advanced Machine Learning" in course_names
    assert "INF-2700 Database Systems" in course_names
    assert "Regular Course Without Prefix" not in course_names


def test_course_filtering_logic_no_matching_prefixes():
    """Test course filtering logic when no courses match the configured prefixes."""
    # Convert test data to CanvasCourse objects
    test_courses = [
        CanvasCourse(id=course["id"], name=course["name"])
        for course in CANVAS_COURSES_WITH_PREFIXES
    ]

    # Simulate prefix that matches no courses
    prefixes = ["NONEXISTENT_"]

    # Apply the same filtering logic as in the router
    if prefixes:
        filtered_courses = [
            course
            for course in test_courses
            if any(course.name.startswith(prefix) for prefix in prefixes)
        ]
    else:
        filtered_courses = test_courses

    assert len(filtered_courses) == 0


def test_course_filtering_logic_case_sensitive():
    """Test that course filtering logic is case-sensitive."""
    # Create case-sensitive test data
    case_sensitive_courses = [
        CanvasCourse(id=1, name="SB_ME_INF-0005 Course"),
        CanvasCourse(id=2, name="sb_me_inf-0006 Course"),  # lowercase
    ]

    # Simulate uppercase prefix filter
    prefixes = ["SB_ME_"]

    # Apply the same filtering logic as in the router
    if prefixes:
        filtered_courses = [
            course
            for course in case_sensitive_courses
            if any(course.name.startswith(prefix) for prefix in prefixes)
        ]
    else:
        filtered_courses = case_sensitive_courses

    assert len(filtered_courses) == 1
    assert filtered_courses[0].name == "SB_ME_INF-0005 Course"
