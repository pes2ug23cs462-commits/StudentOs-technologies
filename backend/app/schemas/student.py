from typing import Any

from pydantic import BaseModel, Field


class StudentProfileUpdate(BaseModel):
    field_of_study: str | None = Field(
        default=None,
        max_length=100,
    )
    academic_year: str | None = Field(
        default=None,
        max_length=30,
    )
    goals: list[str] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)
    profile_completed: bool = False
