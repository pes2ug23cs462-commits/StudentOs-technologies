
import os
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import text

from app.api.auth import require_student
from app.db.database import engine


router = APIRouter(prefix="/api/students", tags=["Profile Documents"])

STORAGE_DIR = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "student_documents"
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": (
        "application/vnd.openxmlformats-officedocument."
        "wordprocessingml.document"
    ),
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


class ProfileLinksUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    github_url: str | None = Field(default=None, max_length=2048)
    linkedin_url: str | None = Field(default=None, max_length=2048)
    portfolio_url: str | None = Field(default=None, max_length=2048)
    kaggle_url: str | None = Field(default=None, max_length=2048)

    @field_validator(
        "github_url",
        "linkedin_url",
        "portfolio_url",
        "kaggle_url",
    )
    @classmethod
    def validate_url(cls, value):
        if value is None or value == "":
            return None

        if not re.match(r"^https?://", value, re.IGNORECASE):
            raise ValueError("URL must start with http:// or https://")

        from urllib.parse import urlsplit

        parsed = urlsplit(value)
        if not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Enter a valid HTTP or HTTPS URL")

        return value


def verify_ownership(student_id: int, student: dict) -> None:
    if student_id != student["student_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own profile",
        )


def get_links(connection, student_id: int) -> dict:
    result = connection.execute(
        text("""
            SELECT github_url, linkedin_url, portfolio_url, kaggle_url
            FROM student_profiles
            WHERE student_id = :student_id
        """),
        {"student_id": student_id},
    ).mappings().first()

    if result is None:
        return {
            "github_url": None,
            "linkedin_url": None,
            "portfolio_url": None,
            "kaggle_url": None,
        }

    return dict(result)


@router.get("/{student_id}/links")
def read_profile_links(
    student_id: int,
    student: dict = Depends(require_student),
):
    verify_ownership(student_id, student)

    with engine.connect() as connection:
        exists = connection.execute(
            text("SELECT student_id FROM students WHERE student_id = :id"),
            {"id": student_id},
        ).first()

        if exists is None:
            raise HTTPException(status_code=404, detail="Student not found")

        return get_links(connection, student_id)


@router.put("/{student_id}/links")
def save_profile_links(
    student_id: int,
    payload: ProfileLinksUpdate,
    student: dict = Depends(require_student),
):
    verify_ownership(student_id, student)

    with engine.begin() as connection:
        exists = connection.execute(
            text("SELECT student_id FROM students WHERE student_id = :id"),
            {"id": student_id},
        ).first()

        if exists is None:
            raise HTTPException(status_code=404, detail="Student not found")

        connection.execute(
            text("""
                INSERT INTO student_profiles (
                    student_id,
                    github_url,
                    linkedin_url,
                    portfolio_url,
                    kaggle_url
                )
                VALUES (
                    :student_id,
                    :github_url,
                    :linkedin_url,
                    :portfolio_url,
                    :kaggle_url
                )
                ON DUPLICATE KEY UPDATE
                    github_url = VALUES(github_url),
                    linkedin_url = VALUES(linkedin_url),
                    portfolio_url = VALUES(portfolio_url),
                    kaggle_url = VALUES(kaggle_url)
            """),
            {"student_id": student_id, **payload.model_dump()},
        )

    return {
        "message": "Profile links saved successfully",
        "student_id": student_id,
    }


@router.post("/{student_id}/documents", status_code=201)
def upload_document(
    student_id: int,
    file: UploadFile = File(...),
    student: dict = Depends(require_student),
):
    verify_ownership(student_id, student)

    original_name = Path(file.filename or "").name
    suffix = Path(original_name).suffix.lower()

    if not original_name or suffix not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Allowed file types: PDF, DOC, DOCX, PNG, JPG, JPEG",
        )

    content_type = ALLOWED_TYPES[suffix]
    storage_name = f"{uuid.uuid4().hex}{suffix}"
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    destination = STORAGE_DIR / storage_name
    total_size = 0

    try:
        with destination.open("xb") as output:
            while True:
                chunk = file.file.read(64 * 1024)
                if not chunk:
                    break

                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Maximum file size is 10 MB",
                    )

                output.write(chunk)

        if total_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        with engine.begin() as connection:
            exists = connection.execute(
                text("SELECT student_id FROM students WHERE student_id = :id"),
                {"id": student_id},
            ).first()

            if exists is None:
                raise HTTPException(
                    status_code=404,
                    detail="Student not found",
                )

            result = connection.execute(
                text("""
                    INSERT INTO student_documents (
                        student_id,
                        original_filename,
                        storage_filename,
                        content_type,
                        file_size
                    )
                    VALUES (
                        :student_id,
                        :original_filename,
                        :storage_filename,
                        :content_type,
                        :file_size
                    )
                """),
                {
                    "student_id": student_id,
                    "original_filename": original_name[:255],
                    "storage_filename": storage_name,
                    "content_type": content_type,
                    "file_size": total_size,
                },
            )

        return {
            "document_id": result.lastrowid,
            "filename": original_name[:255],
            "file_size": total_size,
            "verification_status": "pending",
        }

    except Exception:
        destination.unlink(missing_ok=True)
        raise

    finally:
        file.file.close()


@router.get("/{student_id}/documents")
def list_documents(
    student_id: int,
    student: dict = Depends(require_student),
):
    verify_ownership(student_id, student)

    with engine.connect() as connection:
        exists = connection.execute(
            text("SELECT student_id FROM students WHERE student_id = :id"),
            {"id": student_id},
        ).first()

        if exists is None:
            raise HTTPException(status_code=404, detail="Student not found")

        rows = connection.execute(
            text("""
                SELECT
                    document_id,
                    original_filename,
                    content_type,
                    file_size,
                    verification_status,
                    created_at
                FROM student_documents
                WHERE student_id = :student_id
                ORDER BY created_at DESC, document_id DESC
            """),
            {"student_id": student_id},
        ).mappings().all()

    return [dict(row) for row in rows]


@router.get("/{student_id}/documents/{document_id}")
def download_document(
    student_id: int,
    document_id: int,
    student: dict = Depends(require_student),
):
    verify_ownership(student_id, student)

    with engine.connect() as connection:
        record = connection.execute(
            text("""
                SELECT original_filename, storage_filename, content_type
                FROM student_documents
                WHERE student_id = :student_id
                  AND document_id = :document_id
            """),
            {"student_id": student_id, "document_id": document_id},
        ).mappings().first()

    if record is None:
        raise HTTPException(status_code=404, detail="Document not found")

    path = STORAGE_DIR / record["storage_filename"]

    if not path.is_file() or path.parent.resolve() != STORAGE_DIR.resolve():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=path,
        media_type=record["content_type"],
        filename=record["original_filename"],
        content_disposition_type="attachment",
    )


@router.delete("/{student_id}/documents/{document_id}")
def delete_document(
    student_id: int,
    document_id: int,
    student: dict = Depends(require_student),
):
    verify_ownership(student_id, student)

    with engine.begin() as connection:
        record = connection.execute(
            text("""
                SELECT storage_filename
                FROM student_documents
                WHERE student_id = :student_id
                  AND document_id = :document_id
            """),
            {"student_id": student_id, "document_id": document_id},
        ).mappings().first()

        if record is None:
            raise HTTPException(status_code=404, detail="Document not found")

        connection.execute(
            text("""
                DELETE FROM student_documents
                WHERE student_id = :student_id
                  AND document_id = :document_id
            """),
            {"student_id": student_id, "document_id": document_id},
        )

    (STORAGE_DIR / record["storage_filename"]).unlink(missing_ok=True)

    return {"message": "Document deleted successfully"}
