
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.api.auth import require_student
from app.db.database import engine
from app.schemas.student import StudentProfileUpdate


router = APIRouter(prefix="/api/students", tags=["Students"])


def verify_student_owns_profile(
    student_id: int,
    student: dict,
) -> None:
    if student_id != student["student_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own profile",
        )


def parse_json(value):
    if isinstance(value, str):
        return json.loads(value)
    return value


@router.get("/{student_id}")
def get_student_context(
    student_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_profile(student_id, student)

    query = text("""
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

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"student_id": student_id},
        ).mappings().first()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    student_data = dict(result)
    student_data["goals"] = parse_json(student_data["goals"])
    student_data["preferences"] = parse_json(
        student_data["preferences"]
    )
    student_data["profile_completed"] = (
        bool(student_data["profile_completed"])
        if student_data["profile_completed"] is not None
        else False
    )

    return student_data


@router.put("/{student_id}/profile")
def update_student_profile(
    student_id: int,
    profile: StudentProfileUpdate,
    student: dict = Depends(require_student),
):
    verify_student_owns_profile(student_id, student)

    with engine.begin() as connection:
        student_exists = connection.execute(
            text("""
                SELECT student_id
                FROM students
                WHERE student_id = :id
            """),
            {"id": student_id},
        ).first()

        if student_exists is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found",
            )

        connection.execute(
            text("""
                INSERT INTO student_profiles (
                    student_id,
                    field_of_study,
                    academic_year,
                    goals,
                    preferences,
                    profile_completed
                )
                VALUES (
                    :student_id,
                    :field_of_study,
                    :academic_year,
                    :goals,
                    :preferences,
                    :profile_completed
                )
                ON DUPLICATE KEY UPDATE
                    field_of_study = VALUES(field_of_study),
                    academic_year = VALUES(academic_year),
                    goals = VALUES(goals),
                    preferences = VALUES(preferences),
                    profile_completed = VALUES(profile_completed)
            """),
            {
                "student_id": student_id,
                "field_of_study": profile.field_of_study,
                "academic_year": profile.academic_year,
                "goals": json.dumps(profile.goals),
                "preferences": json.dumps(profile.preferences),
                "profile_completed": profile.profile_completed,
            },
        )

    return {
        "message": "Student profile saved successfully",
        "student_id": student_id,
    }
