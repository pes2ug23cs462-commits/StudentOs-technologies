from typing import Any

from pydantic import BaseModel, Field


class AssessmentContext(BaseModel):
    assignment_id: int
    score: float
    max_score: float
    percentage: float
    completed_at: str


class StudentContext(BaseModel):
    student_id: int
    full_name: str
    field_of_study: str | None = None
    academic_year: str | None = None
    goals: list[str] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)
    profile_completed: bool = False
    assessments: list[AssessmentContext] = Field(default_factory=list)
    average_percentage: float | None = None
    llm_context: str
