
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class OTPRequest(BaseModel):
    phone_number: str = Field(min_length=8, max_length=20)
    purpose: Literal["registration", "login"]

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"\+[1-9]\d{7,14}", value):
            raise ValueError(
                "Use international phone format, for example +919876543210"
            )
        return value


class OTPVerifyRequest(BaseModel):
    phone_number: str = Field(min_length=8, max_length=20)
    purpose: Literal["registration", "login"]
    code: str = Field(pattern=r"^\d{6}$")

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"\+[1-9]\d{7,14}", value):
            raise ValueError("Enter a valid international phone number")
        return value
