
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


PlanStatus = Literal["DRAFT", "REVIEW", "APPROVED", "ACTIVE"]


class PlanCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    goal: str = Field(min_length=1, max_length=5000)
    duration_weeks: int = Field(ge=1, le=52)


class PlanUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    goal: str | None = Field(default=None, min_length=1, max_length=5000)
    duration_weeks: int | None = Field(default=None, ge=1, le=52)


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: int
    student_id: int
    title: str
    goal: str
    duration_weeks: int
    status: PlanStatus
    created_at: datetime
    updated_at: datetime
