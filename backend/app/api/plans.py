
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.api.auth import require_student
from app.db.database import engine
from app.schemas.plan_schemas import PlanCreate, PlanResponse, PlanUpdate

router = APIRouter(prefix="/api/plans", tags=["Plans"])


def plan_to_dict(row: Any) -> dict:
    return dict(row)


@router.post(
    "",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_plan(
    payload: PlanCreate,
    student: dict = Depends(require_student),
):
    student_id = student["student_id"]

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                INSERT INTO student_plans
                    (student_id, title, goal, duration_weeks)
                VALUES
                    (:student_id, :title, :goal, :duration_weeks)
            """),
            {
                "student_id": student_id,
                "title": payload.title,
                "goal": payload.goal,
                "duration_weeks": payload.duration_weeks,
            },
        )

        plan_id = result.lastrowid

        row = connection.execute(
            text("""
                SELECT plan_id, student_id, title, goal, duration_weeks,
                       status, created_at, updated_at
                FROM student_plans
                WHERE plan_id = :plan_id AND student_id = :student_id
            """),
            {"plan_id": plan_id, "student_id": student_id},
        ).mappings().one()

    return plan_to_dict(row)


@router.get("", response_model=list[PlanResponse])
def list_plans(student: dict = Depends(require_student)):
    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT plan_id, student_id, title, goal, duration_weeks,
                       status, created_at, updated_at
                FROM student_plans
                WHERE student_id = :student_id
                ORDER BY created_at DESC, plan_id DESC
            """),
            {"student_id": student["student_id"]},
        ).mappings().all()

    return [plan_to_dict(row) for row in rows]


@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(
    plan_id: int,
    student: dict = Depends(require_student),
):
    with engine.connect() as connection:
        row = connection.execute(
            text("""
                SELECT plan_id, student_id, title, goal, duration_weeks,
                       status, created_at, updated_at
                FROM student_plans
                WHERE plan_id = :plan_id AND student_id = :student_id
            """),
            {
                "plan_id": plan_id,
                "student_id": student["student_id"],
            },
        ).mappings().first()

    if row is None:
        raise HTTPException(status_code=404, detail="Plan not found")

    return plan_to_dict(row)


@router.patch("/{plan_id}", response_model=PlanResponse)
def revise_plan(
    plan_id: int,
    payload: PlanUpdate,
    student: dict = Depends(require_student),
):
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Update values cannot be null",
        )

    allowed_fields = {"title", "goal", "duration_weeks"}
    if not set(updates).issubset(allowed_fields):
        raise HTTPException(status_code=400, detail="Invalid update fields")

    assignments = ", ".join(f"{field} = :{field}" for field in updates)
    params = {
        **updates,
        "plan_id": plan_id,
        "student_id": student["student_id"],
    }

    with engine.begin() as connection:
        current = connection.execute(
            text("""
                SELECT status FROM student_plans
                WHERE plan_id = :plan_id AND student_id = :student_id
                FOR UPDATE
            """),
            {
                "plan_id": plan_id,
                "student_id": student["student_id"],
            },
        ).mappings().first()

        if current is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        if current["status"] != "DRAFT":
            raise HTTPException(
                status_code=409,
                detail="Only draft plans can be revised",
            )

        connection.execute(
            text(f"""
                UPDATE student_plans
                SET {assignments}
                WHERE plan_id = :plan_id AND student_id = :student_id
            """),
            params,
        )

        row = connection.execute(
            text("""
                SELECT plan_id, student_id, title, goal, duration_weeks,
                       status, created_at, updated_at
                FROM student_plans
                WHERE plan_id = :plan_id AND student_id = :student_id
            """),
            {
                "plan_id": plan_id,
                "student_id": student["student_id"],
            },
        ).mappings().one()

    return plan_to_dict(row)


def transition_plan(
    plan_id: int,
    student_id: int,
    expected_status: str,
    target_status: str,
) -> dict:
    with engine.begin() as connection:
        current = connection.execute(
            text("""
                SELECT status FROM student_plans
                WHERE plan_id = :plan_id AND student_id = :student_id
                FOR UPDATE
            """),
            {"plan_id": plan_id, "student_id": student_id},
        ).mappings().first()

        if current is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        if current["status"] != expected_status:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Plan must be in {expected_status} status "
                    f"before it can become {target_status}"
                ),
            )

        connection.execute(
            text("""
                UPDATE student_plans
                SET status = :target_status
                WHERE plan_id = :plan_id AND student_id = :student_id
            """),
            {
                "target_status": target_status,
                "plan_id": plan_id,
                "student_id": student_id,
            },
        )

        row = connection.execute(
            text("""
                SELECT plan_id, student_id, title, goal, duration_weeks,
                       status, created_at, updated_at
                FROM student_plans
                WHERE plan_id = :plan_id AND student_id = :student_id
            """),
            {"plan_id": plan_id, "student_id": student_id},
        ).mappings().one()

    return plan_to_dict(row)


@router.post("/{plan_id}/review", response_model=PlanResponse)
def submit_plan_for_review(
    plan_id: int,
    student: dict = Depends(require_student),
):
    return transition_plan(
        plan_id, student["student_id"], "DRAFT", "REVIEW"
    )


@router.post("/{plan_id}/approve", response_model=PlanResponse)
def approve_plan(
    plan_id: int,
    student: dict = Depends(require_student),
):
    return transition_plan(
        plan_id, student["student_id"], "REVIEW", "APPROVED"
    )


@router.post("/{plan_id}/activate", response_model=PlanResponse)
def activate_plan(
    plan_id: int,
    student: dict = Depends(require_student),
):
    return transition_plan(
        plan_id, student["student_id"], "APPROVED", "ACTIVE"
    )
