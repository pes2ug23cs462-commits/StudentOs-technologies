from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.api.auth import require_student
from app.db.database import engine
from app.schemas.goal import StudentGoalCreate, StudentGoalUpdate


router = APIRouter(
    prefix="/api/students/{student_id}/goals",
    tags=["Student Goals"],
)


def verify_student_owns_goals(student_id: int, student: dict) -> None:
    if student_id != student["student_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own goals",
        )


def goal_to_dict(row: Any) -> dict:
    result = dict(row)

    if isinstance(result.get("target_date"), date):
        result["target_date"] = result["target_date"].isoformat()

    for field in ("created_at", "updated_at"):
        if result.get(field) is not None:
            result[field] = result[field].isoformat()

    return result


@router.get("")
def list_goals(
    student_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_goals(student_id, student)

    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT *
                FROM student_goals
                WHERE student_id = :student_id
                ORDER BY created_at DESC, goal_id DESC
            """),
            {"student_id": student_id},
        ).mappings().all()

    return [goal_to_dict(row) for row in rows]


@router.post("", status_code=201)
def create_goal(
    student_id: int,
    goal: StudentGoalCreate,
    student: dict = Depends(require_student),
):
    verify_student_owns_goals(student_id, student)

    values = goal.model_dump()
    values["title"] = values["title"].strip()

    if not values["title"]:
        raise HTTPException(status_code=422, detail="Goal title cannot be empty")

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                INSERT INTO student_goals
                    (student_id, title, description, category,
                     progress, status, target_date)
                VALUES
                    (:student_id, :title, :description, :category,
                     :progress, :status, :target_date)
            """),
            {"student_id": student_id, **values},
        )

        row = connection.execute(
            text("""
                SELECT *
                FROM student_goals
                WHERE goal_id = :goal_id AND student_id = :student_id
            """),
            {
                "goal_id": result.lastrowid,
                "student_id": student_id,
            },
        ).mappings().one()

    return goal_to_dict(row)


@router.put("/{goal_id}")
def update_goal(
    student_id: int,
    goal_id: int,
    goal: StudentGoalUpdate,
    student: dict = Depends(require_student),
):
    verify_student_owns_goals(student_id, student)

    updates = goal.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Update values cannot be null",
        )

    if "title" in updates:
        updates["title"] = updates["title"].strip()
        if not updates["title"]:
            raise HTTPException(
                status_code=422,
                detail="Goal title cannot be empty",
            )

    allowed_fields = {
        "title", "description", "category",
        "progress", "status", "target_date",
    }
    assignments = ", ".join(
        f"{field} = :{field}" for field in updates
    )
    params = {
        **updates,
        "goal_id": goal_id,
        "student_id": student_id,
    }

    with engine.begin() as connection:
        result = connection.execute(
            text(f"""
                UPDATE student_goals
                SET {assignments}
                WHERE goal_id = :goal_id AND student_id = :student_id
            """),
            params,
        )

        if result.rowcount == 0:
            existing = connection.execute(
                text("""
                    SELECT goal_id FROM student_goals
                    WHERE goal_id = :goal_id AND student_id = :student_id
                """),
                {"goal_id": goal_id, "student_id": student_id},
            ).first()

            if existing is None:
                raise HTTPException(status_code=404, detail="Goal not found")

        row = connection.execute(
            text("""
                SELECT *
                FROM student_goals
                WHERE goal_id = :goal_id AND student_id = :student_id
            """),
            {"goal_id": goal_id, "student_id": student_id},
        ).mappings().one()

    return goal_to_dict(row)


@router.delete("/{goal_id}")
def delete_goal(
    student_id: int,
    goal_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_goals(student_id, student)

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM student_goals
                WHERE goal_id = :goal_id AND student_id = :student_id
            """),
            {"goal_id": goal_id, "student_id": student_id},
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Goal not found")

    return {"message": "Goal deleted successfully", "goal_id": goal_id}
