
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.api.auth import require_student
from app.db.database import engine
from app.schemas.task import StudentTaskCreate, StudentTaskUpdate

router = APIRouter(
    prefix="/api/students/{student_id}/tasks",
    tags=["Student Tasks"],
)


def verify_student_owns_tasks(student_id: int, student: dict) -> None:
    if student_id != student["student_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own tasks",
        )


def task_to_dict(row: Any) -> dict:
    return dict(row)


@router.post("")
def create_task(
    student_id: int,
    task: StudentTaskCreate,
    student: dict = Depends(require_student),
):
    verify_student_owns_tasks(student_id, student)

    with engine.begin() as connection:
        existing_student = connection.execute(
            text("SELECT student_id FROM students WHERE student_id = :id"),
            {"id": student_id},
        ).first()

        if existing_student is None:
            raise HTTPException(status_code=404, detail="Student not found")

        result = connection.execute(
            text("""
                INSERT INTO student_tasks
                    (student_id, title, description, due_date, priority, status)
                VALUES
                    (:student_id, :title, :description, :due_date, :priority, :status)
            """),
            {
                "student_id": student_id,
                "title": task.title,
                "description": task.description,
                "due_date": task.due_date,
                "priority": task.priority,
                "status": task.status,
            },
        )

        task_id = result.lastrowid

        row = connection.execute(
            text("""
                SELECT * FROM student_tasks
                WHERE task_id = :id AND student_id = :student_id
            """),
            {"id": task_id, "student_id": student_id},
        ).mappings().one()

    return task_to_dict(row)


@router.get("")
def list_tasks(
    student_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_tasks(student_id, student)

    with engine.connect() as connection:
        existing_student = connection.execute(
            text("SELECT student_id FROM students WHERE student_id = :id"),
            {"id": student_id},
        ).first()

        if existing_student is None:
            raise HTTPException(status_code=404, detail="Student not found")

        rows = connection.execute(
            text("""
                SELECT * FROM student_tasks
                WHERE student_id = :student_id
                ORDER BY due_date IS NULL, due_date, task_id
            """),
            {"student_id": student_id},
        ).mappings().all()

    return [task_to_dict(row) for row in rows]


@router.put("/{task_id}")
def update_task(
    student_id: int,
    task_id: int,
    task: StudentTaskUpdate,
    student: dict = Depends(require_student),
):
    verify_student_owns_tasks(student_id, student)

    updates = task.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Update values cannot be null; provide a value for each field",
        )

    allowed_fields = {"title", "description", "due_date", "priority", "status"}

    if not set(updates).issubset(allowed_fields):
        raise HTTPException(status_code=400, detail="Invalid update fields")

    assignments = ", ".join(f"{field} = :{field}" for field in updates)
    params = dict(updates)
    params.update({"student_id": student_id, "task_id": task_id})

    with engine.begin() as connection:
        result = connection.execute(
            text(f"""
                UPDATE student_tasks
                SET {assignments}
                WHERE task_id = :task_id AND student_id = :student_id
            """),
            params,
        )

        if result.rowcount == 0:
            existing_task = connection.execute(
                text("""
                    SELECT task_id FROM student_tasks
                    WHERE task_id = :task_id AND student_id = :student_id
                """),
                {"task_id": task_id, "student_id": student_id},
            ).first()

            if existing_task is None:
                raise HTTPException(status_code=404, detail="Task not found")

        updated = connection.execute(
            text("""
                SELECT * FROM student_tasks
                WHERE task_id = :task_id AND student_id = :student_id
            """),
            {"task_id": task_id, "student_id": student_id},
        ).mappings().one()

    return task_to_dict(updated)


@router.delete("/{task_id}")
def delete_task(
    student_id: int,
    task_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_tasks(student_id, student)

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM student_tasks
                WHERE task_id = :task_id AND student_id = :student_id
            """),
            {"task_id": task_id, "student_id": student_id},
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")

    return {
        "message": "Task deleted successfully",
        "task_id": task_id,
    }
