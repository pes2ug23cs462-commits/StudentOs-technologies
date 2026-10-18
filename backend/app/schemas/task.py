from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StudentTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    due_date: datetime | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["pending", "in_progress", "completed"] = "pending"


class StudentTaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    due_date: datetime | None = None
    priority: Literal["low", "medium", "high"] | None = None
    status: Literal["pending", "in_progress", "completed"] | None = None
