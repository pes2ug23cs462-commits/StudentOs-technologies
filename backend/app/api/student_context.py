from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import require_student
from app.context.student_context_builder import build_student_context
from app.models.student_context import StudentContext

router = APIRouter(prefix="/api/students", tags=["Student AI Context"])


def verify_student_owns_context(
    student_id: int,
    student: dict,
) -> None:
    if student_id != student["student_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own context",
        )


@router.get("/{student_id}/context", response_model=StudentContext)
def get_student_ai_context(
    student_id: int,
    student: dict = Depends(require_student),
):
    verify_student_owns_context(student_id, student)
    return build_student_context(student_id)
