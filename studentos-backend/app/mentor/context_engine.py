
"""
StudentOS Student Context Engine

Purpose:
- Normalize mock or API-provided student context.
- Extract only approved, relevant fields.
- Identify important missing information.
- Prepare a safe context snapshot for mentor workflows.

This module does not access a database or external API.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any


def _as_dict(value: Any) -> dict:
    """Return a dictionary or an empty dictionary."""
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list:
    """Return a list or an empty list."""
    return value if isinstance(value, list) else []


def normalize_student_context(
    student_context: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Normalize student context into a predictable structure.

    Unknown top-level fields are not forwarded to the LLM.
    Original input is not modified.
    """
    source = deepcopy(_as_dict(student_context))

    profile = _as_dict(source.get("profile"))
    preferences = _as_dict(source.get("preferences"))

    available_minutes = profile.get("available_minutes_per_day")

    # Reject invalid study-time values instead of trusting them.
    if (
        not isinstance(available_minutes, int)
        or isinstance(available_minutes, bool)
        or not 1 <= available_minutes <= 1440
    ):
        available_minutes = None

    normalized_profile = {
        "first_name": profile.get("first_name"),
        "field_of_study": profile.get("field_of_study"),
        "career_goal": profile.get("career_goal"),
        "experience_level": profile.get("experience_level"),
        "available_minutes_per_day": available_minutes,
    }

    # Remove missing and blank profile values.
    normalized_profile = {
        key: value
        for key, value in normalized_profile.items()
        if value is not None and value != ""
    }

    return {
        "student_id": source.get("student_id"),
        "is_synthetic": bool(source.get("is_synthetic", False)),
        "profile": normalized_profile,
        "goals": _as_list(source.get("goals")),
        "assessments": _as_list(source.get("assessments")),
        "progress": _as_list(source.get("progress")),
        "preferences": preferences,
        "conversation_summary": source.get("conversation_summary"),
        "llm_context": source.get("llm_context"),
    }


def identify_missing_context(
    context: dict[str, Any],
    *,
    require_goal: bool = False,
    require_available_time: bool = False,
) -> list[str]:
    """
    Identify missing fields.

    Requirements depend on the workflow:
    - General chat does not require a complete profile.
    - Planning can require a goal and available study time.
    """
    missing = []
    profile = _as_dict(context.get("profile"))

    if require_goal and not profile.get("career_goal") and not context.get("goals"):
        missing.append("career_goal")

    if (
        require_available_time
        and not profile.get("available_minutes_per_day")
    ):
        missing.append("available_minutes_per_day")

    return missing


def build_context_snapshot(
    student_context: dict[str, Any] | None,
    *,
    require_goal: bool = False,
    require_available_time: bool = False,
) -> dict[str, Any]:
    """
    Build the final context snapshot for a mentor workflow.
    """
    context = normalize_student_context(student_context)

    missing_fields = identify_missing_context(
        context,
        require_goal=require_goal,
        require_available_time=require_available_time,
    )

    return {
        "context": context,
        "missing_fields": missing_fields,
        "is_complete": len(missing_fields) == 0,
    }


if __name__ == "__main__":
    # Local smoke test using synthetic student data.
    mock_student = {
        "student_id": "test_student_001",
        "is_synthetic": True,
        "profile": {
            "first_name": "Aarav",
            "field_of_study": "Computer Science",
            "career_goal": "Machine Learning Engineer",
            "experience_level": "Beginner",
            "available_minutes_per_day": 60,
        },
        "goals": ["Improve Python fundamentals"],
        "assessments": [
            {"subject": "Python", "score": 80, "max_score": 100},
            {"subject": "Statistics", "score": 45, "max_score": 100},
        ],
        "progress": [],
        "preferences": {"learning_style": "practical"},
        "internal_database_field": "must_not_be_forwarded",
    }

    result = build_context_snapshot(
        mock_student,
        require_goal=True,
        require_available_time=True,
    )

    assert result["is_complete"] is True
    assert result["missing_fields"] == []
    assert "internal_database_field" not in result["context"]
    assert result["context"]["profile"]["available_minutes_per_day"] == 60

    print("CONTEXT ENGINE TEST: PASSED")
    print("Student:", result["context"]["profile"]["first_name"])
    print("Available minutes:", result["context"]["profile"]["available_minutes_per_day"])
    print("Missing fields:", result["missing_fields"])
