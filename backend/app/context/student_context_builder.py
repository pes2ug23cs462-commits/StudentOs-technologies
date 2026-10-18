import json
from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import text

from app.db.database import engine
from app.models.student_context import AssessmentContext, StudentContext


def parse_json(value, default):
    if value is None:
        return default
    if isinstance(value, str):
        return json.loads(value)
    return value


def to_iso(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def build_student_context(student_id: int) -> StudentContext:
    profile_query = text("""
        SELECT
            s.student_id,
            s.full_name,
            s.email,
            p.field_of_study,
            p.academic_year,
            p.goals,
            p.preferences,
            p.profile_completed
        FROM students AS s
        LEFT JOIN student_profiles AS p
            ON s.student_id = p.student_id
        WHERE s.student_id = :student_id
    """)

    assessment_query = text("""
        SELECT assignment_id, score, max_score, completed_at
        FROM assignment_results
        WHERE student_id = :student_id
        ORDER BY completed_at DESC, result_id DESC
    """)

    with engine.connect() as connection:
        profile_row = connection.execute(
            profile_query, {"student_id": student_id}
        ).mappings().first()

        if profile_row is None:
            raise HTTPException(status_code=404, detail="Student not found")

        assessment_rows = connection.execute(
            assessment_query, {"student_id": student_id}
        ).mappings().all()

    profile = dict(profile_row)
    goals = parse_json(profile.get("goals"), [])
    preferences = parse_json(profile.get("preferences"), {})

    assessments = []
    for row in assessment_rows:
        score = float(row["score"])
        max_score = float(row["max_score"])
        percentage = round((score / max_score) * 100, 2) if max_score > 0 else 0.0

        assessments.append(
            AssessmentContext(
                assignment_id=int(row["assignment_id"]),
                score=score,
                max_score=max_score,
                percentage=percentage,
                completed_at=to_iso(row["completed_at"]),
            )
        )

    average_percentage = (
        round(sum(item.percentage for item in assessments) / len(assessments), 2)
        if assessments
        else None
    )

    context_lines = [
        f"Student: {profile['full_name']}",
        f"Student ID: {student_id}",
        f"Field of study: {profile.get('field_of_study') or 'Not provided'}",
        f"Academic year: {profile.get('academic_year') or 'Not provided'}",
        f"Learning goals: {', '.join(goals) if goals else 'Not provided'}",
        f"Learning preferences: {json.dumps(preferences, ensure_ascii=False)}",
        f"Profile completed: {bool(profile.get('profile_completed'))}",
    ]

    if assessments:
        context_lines.append("Assessment history:")
        for item in assessments:
            context_lines.append(
                f"- Assignment {item.assignment_id}: "
                f"{item.score:g}/{item.max_score:g} "
                f"({item.percentage:.2f}%), completed {item.completed_at}"
            )
        context_lines.append(
            f"Average assessment percentage: {average_percentage:.2f}%"
        )
    else:
        context_lines.append("Assessment history: No recorded assessments.")

    return StudentContext(
        student_id=student_id,
        full_name=profile["full_name"],
        field_of_study=profile.get("field_of_study"),
        academic_year=profile.get("academic_year"),
        goals=goals,
        preferences=preferences,
        profile_completed=bool(profile.get("profile_completed")),
        assessments=assessments,
        average_percentage=average_percentage,
        llm_context="\n".join(context_lines),
    )
