"""
StudentOS Context Adapter.

Adapts the production StudentContext Pydantic model into the dictionary
structure expected by the mentor prototype and LLM prompt serialization.
"""

from __future__ import annotations

from typing import Any

from app.models.student_context import StudentContext


def adapt_student_context(context: StudentContext) -> dict[str, Any]:
    """
    Adapt production StudentContext into the dictionary format expected by mentor workflows.

    - Converts student_id to string matching prototype state contracts.
    - Maps student profile information safely.
    - Preserves goals, assessments, preferences, and llm_context.
    - Never invents student data or makes database queries.
    """
    profile: dict[str, Any] = {
        "full_name": context.full_name,
        "profile_completed": context.profile_completed,
    }
    if context.full_name:
        profile["first_name"] = context.full_name.split()[0]
    if context.field_of_study is not None:
        profile["field_of_study"] = context.field_of_study
    if context.academic_year is not None:
        profile["academic_year"] = context.academic_year

    # Surface daily study time preference into profile if present in preferences
    if (
        isinstance(context.preferences, dict)
        and "available_minutes_per_day" in context.preferences
    ):
        profile["available_minutes_per_day"] = context.preferences[
            "available_minutes_per_day"
        ]

    assessments: list[dict[str, Any]] = [
        {
            "assignment_id": a.assignment_id,
            "score": a.score,
            "max_score": a.max_score,
            "percentage": a.percentage,
            "completed_at": a.completed_at,
        }
        for a in context.assessments
    ]

    adapted: dict[str, Any] = {
        "student_id": str(context.student_id),
        "is_synthetic": False,
        "profile": profile,
        "goals": list(context.goals),
        "assessments": assessments,
        "preferences": dict(context.preferences),
        "llm_context": context.llm_context,
    }

    if context.average_percentage is not None:
        adapted["average_percentage"] = context.average_percentage

    return adapted
