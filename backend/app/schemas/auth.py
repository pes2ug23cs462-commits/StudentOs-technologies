from pydantic import BaseModel, Field, field_validator


class SignUpRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name cannot be empty")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if (
            not value
            or "@" not in value
            or value.startswith("@")
            or value.endswith("@")
            or "." not in value.rsplit("@", 1)[-1]
        ):
            raise ValueError("Enter a valid email address")
        return value


class SignInRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    student: dict
