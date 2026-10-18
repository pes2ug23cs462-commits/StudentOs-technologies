from fastapi import APIRouter

from app.context.student_context_builder import build_student_context
from app.models.student_context import StudentContext

router = APIRouter(prefix="/api/students", tags=["Student AI Context"])


@router.get("/{student_id}/context", response_model=StudentContext)
def get_student_ai_context(student_id: int):
    return build_student_context(student_id)
