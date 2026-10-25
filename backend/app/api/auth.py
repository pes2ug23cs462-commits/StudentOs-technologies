from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.auth.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)
from app.db.database import engine
from app.schemas.auth import SignInRequest, SignUpRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)
SESSION_DAYS = 7


def create_session(student_id: int) -> dict:
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)

    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO auth_sessions (student_id, token_hash, expires_at)
                VALUES (:student_id, :token_hash, :expires_at)
            """),
            {
                "student_id": student_id,
                "token_hash": hash_session_token(token),
                "expires_at": expires_at.replace(tzinfo=None),
            },
        )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": expires_at.isoformat(),
    }


def require_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="A valid Bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT s.student_id, s.full_name, s.email
                FROM auth_sessions AS a
                JOIN students AS s ON s.student_id = a.student_id
                WHERE a.token_hash = :token_hash
                  AND a.expires_at > :now
            """),
            {"token_hash": hash_session_token(token), "now": now},
        ).mappings().first()

    if result is None:
        raise HTTPException(
            status_code=401,
            detail="Session is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "student_id": result["student_id"],
        "full_name": result["full_name"],
        "email": result["email"],
    }


@router.post("/signup", status_code=201)
def signup(payload: SignUpRequest):
    password_hash = hash_password(payload.password)

    try:
        with engine.begin() as connection:
            existing = connection.execute(
                text("SELECT student_id FROM students WHERE email = :email"),
                {"email": payload.email},
            ).first()

            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists",
                )

            result = connection.execute(
                text("""
                    INSERT INTO students (full_name, email)
                    VALUES (:full_name, :email)
                """),
                {"full_name": payload.full_name, "email": payload.email},
            )
            student_id = result.lastrowid

            connection.execute(
                text("""
                    INSERT INTO student_auth (student_id, password_hash)
                    VALUES (:student_id, :password_hash)
                """),
                {"student_id": student_id, "password_hash": password_hash},
            )

    except HTTPException:
        raise
    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail="Unable to create the account"
        ) from exc

    session = create_session(student_id)

    return {
        "message": "Account created successfully",
        **session,
        "student": {
            "student_id": student_id,
            "full_name": payload.full_name,
            "email": payload.email,
        },
    }


@router.post("/signin")
def signin(payload: SignInRequest):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT s.student_id, s.full_name, s.email, a.password_hash
                FROM students AS s
                JOIN student_auth AS a ON a.student_id = s.student_id
                WHERE s.email = :email
            """),
            {"email": payload.email},
        ).mappings().first()

    if result is None or not verify_password(
        payload.password,
        result["password_hash"] if result else "",
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    session = create_session(result["student_id"])

    return {
        "message": "Signed in successfully",
        **session,
        "student": {
            "student_id": result["student_id"],
            "full_name": result["full_name"],
            "email": result["email"],
        },
    }


@router.get("/me")
def get_current_student(student: dict = Depends(require_student)):
    return student


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="A Bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with engine.begin() as connection:
        result = connection.execute(
            text("DELETE FROM auth_sessions WHERE token_hash = :token_hash"),
            {"token_hash": hash_session_token(credentials.credentials)},
        )

    if result.rowcount == 0:
        raise HTTPException(status_code=401, detail="Session is invalid or expired")

    return {"message": "Logged out successfully"}
