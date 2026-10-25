from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


GoalStatus = Literal["not_started", "in_progress", "completed"]


class StudentGoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str = Field(default="personal", max_length=50)
    progress: int = Field(default=0, ge=0, le=100)
    status: GoalStatus = "not_started"
    target_date: date | None = None


class StudentGoalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    progress: int | None = Field(default=None, ge=0, le=100)
    status: GoalStatus | None = None
    target_date: date | None = None
