
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.auth import require_student
from app.db.database import engine
from app.schemas.skill import StudentSkillCreate, StudentSkillUpdate


router = APIRouter(
    prefix="/api/students/{student_id}/skills",
    tags=["Student Skills"],
)


def verify_student_owns_skills(student_id: int, student: dict) -> None:
    if student_id != student["student_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own skills",
        )


def skill_to_dict(row: Any) -> dict:
    result = dict(row)

    for field in ("created_at", "updated_at"):
        value = result.get(field)
        if isinstance(value, (date, datetime)):
            result[field] = value.isoformat()

    return result


def get_skill(connection, student_id: int, skill_id: int):
    return connection.execute(
        text("""
            SELECT *
            FROM student_skills
            WHERE skill_id = :skill_id
              AND student_id = :student_id
        """),
        {
            "skill_id": skill_id,
            "student_id": student_id,
        },
    ).mappings().first()


@router.get("")
def list_skills(
    student_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_skills(student_id, student)

    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT *
                FROM student_skills
                WHERE student_id = :student_id
                ORDER BY skill_name ASC, skill_id ASC
            """),
            {"student_id": student_id},
        ).mappings().all()

    return [skill_to_dict(row) for row in rows]


@router.post("", status_code=201)
def create_skill(
    student_id: int,
    skill: StudentSkillCreate,
    student: dict = Depends(require_student),
):
    verify_student_owns_skills(student_id, student)

    values = skill.model_dump()
    values["skill_name"] = values["skill_name"].strip()

    if not values["skill_name"]:
        raise HTTPException(
            status_code=422,
            detail="Skill name cannot be empty",
        )

    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("""
                    INSERT INTO student_skills
                        (student_id, skill_name, skill_level)
                    VALUES
                        (:student_id, :skill_name, :skill_level)
                """),
                {
                    "student_id": student_id,
                    **values,
                },
            )

            row = get_skill(
                connection,
                student_id,
                result.lastrowid,
            )

            if row is None:
                raise HTTPException(
                    status_code=500,
                    detail="Could not retrieve the created skill",
                )

            created = skill_to_dict(row)

    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="This skill already exists in your profile",
        ) from exc

    return created


@router.put("/{skill_id}")
def update_skill(
    student_id: int,
    skill_id: int,
    skill: StudentSkillUpdate,
    student: dict = Depends(require_student),
):
    verify_student_owns_skills(student_id, student)

    updates = skill.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No fields provided",
        )

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Update values cannot be null",
        )

    if "skill_name" in updates:
        updates["skill_name"] = updates["skill_name"].strip()

        if not updates["skill_name"]:
            raise HTTPException(
                status_code=422,
                detail="Skill name cannot be empty",
            )

    allowed_fields = {"skill_name", "skill_level"}

    if not set(updates).issubset(allowed_fields):
        raise HTTPException(
            status_code=400,
            detail="Invalid skill fields",
        )

    assignments = ", ".join(
        f"{field} = :{field}" for field in updates
    )

    params = {
        **updates,
        "skill_id": skill_id,
        "student_id": student_id,
    }

    try:
        with engine.begin() as connection:
            result = connection.execute(
                text(f"""
                    UPDATE student_skills
                    SET {assignments}
                    WHERE skill_id = :skill_id
                      AND student_id = :student_id
                """),
                params,
            )

            if result.rowcount == 0:
                existing = get_skill(
                    connection,
                    student_id,
                    skill_id,
                )

                if existing is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Skill not found",
                    )

            row = get_skill(
                connection,
                student_id,
                skill_id,
            )

            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail="Skill not found",
                )

            updated = skill_to_dict(row)

    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="A skill with that name already exists in your profile",
        ) from exc

    return updated


@router.delete("/{skill_id}")
def delete_skill(
    student_id: int,
    skill_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_skills(student_id, student)

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM student_skills
                WHERE skill_id = :skill_id
                  AND student_id = :student_id
            """),
            {
                "skill_id": skill_id,
                "student_id": student_id,
            },
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Skill not found",
            )

    return {
        "message": "Skill deleted successfully",
        "skill_id": skill_id,
    }
