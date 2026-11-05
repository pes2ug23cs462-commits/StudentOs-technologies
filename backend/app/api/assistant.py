"""
FastAPI router for the StudentOS RAG Study Assistant.

Provides an authenticated endpoint for students to query their study materials:
- Route: POST /api/assistant/ask
- Request: AssistantQueryRequest (message, top_k)
- Response: AssistantQueryResponse (answer, intent, citations, sources_used)
- Tenant isolation: student_id is strictly sourced from authenticated session.
- Service safety: Reuses an explicitly configured application-level service.
                  Refuses to construct unconfigured VectorStore or trigger ONNX fallback.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import require_student
from app.schemas.assistant import AssistantQueryRequest, AssistantQueryResponse
from app.services.study_assistant import StudyAssistantService

logger = logging.getLogger("studentos.api.assistant")

router = APIRouter(prefix="/api/assistant", tags=["Assistant"])

# Application-level service instance registry (reused across requests)
_assistant_service: Optional[StudyAssistantService] = None


def set_study_assistant_service(service: Optional[StudyAssistantService]) -> None:
    """
    Set or reset the application-level StudyAssistantService singleton.
    Allows runtime wiring with a configured VectorStore and test injection.
    """
    global _assistant_service
    _assistant_service = service


def get_study_assistant_service() -> StudyAssistantService:
    """
    FastAPI dependency returning the active StudyAssistantService.

    Safety constraints:
    - Never constructs VectorStore without an explicitly configured embedding function.
    - Never triggers Chroma's default ONNX model download.
    - Does not create a new embedding model per request.
    - Reuses the existing application-level instance if configured.
    - Raises HTTP 503 Service Unavailable if uninitialized, stopping execution safely.
    - Preserves lazy Groq client initialization.
    """
    global _assistant_service
    if _assistant_service is not None:
        return _assistant_service

    logger.warning("Assistant API called but no configured StudyAssistantService is available.")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Study assistant service is not initialized: no active vector store is configured.",
    )


@router.post("/ask", response_model=AssistantQueryResponse)
def ask_assistant(
    payload: AssistantQueryRequest,
    student: dict = Depends(require_student),
    service: StudyAssistantService = Depends(get_study_assistant_service),
) -> AssistantQueryResponse:
    """
    Query the AI Study Assistant with grounding in the student's active study materials.

    - Requires an authenticated student session (Bearer token).
    - Student ID is sourced exclusively from session context.
    - Client-supplied student IDs are never accepted.
    """
    student_id = student["student_id"]

    try:
        return service.ask(
            student_id=student_id,
            query=payload.message,
            top_k=payload.top_k,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error(
            "Study assistant execution error for student_id=%d: %s",
            student_id,
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the assistant query.",
        ) from exc
