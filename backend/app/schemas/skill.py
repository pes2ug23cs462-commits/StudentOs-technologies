
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


SkillLevel = Literal["Beginner", "Intermediate", "Advanced"]


class StudentSkillCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    skill_name: str = Field(min_length=1, max_length=100)
    skill_level: SkillLevel = "Beginner"


class StudentSkillUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    skill_name: str | None = Field(default=None, min_length=1, max_length=100)
    skill_level: SkillLevel | None = None
