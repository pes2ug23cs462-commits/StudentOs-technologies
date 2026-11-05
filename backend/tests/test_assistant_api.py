"""
Offline unit tests for the StudentOS RAG Study Assistant API.

Tests authentication, payload forwarding, student_id isolation, schema validation,
service failure handling, and dependency wiring.
"""

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError

from app.api.assistant import (
    ask_assistant,
    get_study_assistant_service,
    router,
    set_study_assistant_service,
)
from app.api.auth import require_student
from app.main import app
from app.schemas.assistant import (
    AssistantQueryRequest,
    AssistantQueryResponse,
    Citation,
)
from app.services.study_assistant import StudyAssistantService


@pytest.fixture(autouse=True)
def reset_service_registry():
    """Ensure the assistant service registry is clean before and after each test."""
    set_study_assistant_service(None)
    yield
    set_study_assistant_service(None)


def test_router_mounting_and_route_configuration():
    """Verify router prefix and endpoint configuration in app."""
    assert router.prefix == "/api/assistant"

    # Verify endpoint is registered in router with full prefix
    router_paths = [r.path for r in router.routes if hasattr(r, "path")]
    assert "/api/assistant/ask" in router_paths

    route = next(r for r in router.routes if hasattr(r, "path") and r.path == "/api/assistant/ask")
    assert "POST" in route.methods


def test_unauthenticated_request_rejected_with_401():
    """Verify that missing or non-Bearer credentials trigger HTTP 401."""
    # 1. Missing credentials (None)
    with pytest.raises(HTTPException) as exc_info:
        require_student(credentials=None)
    assert exc_info.value.status_code == 401
    assert "Bearer" in exc_info.value.headers.get("WWW-Authenticate", "")

    # 2. Invalid authorization scheme (e.g., Basic)
    invalid_creds = HTTPAuthorizationCredentials(scheme="Basic", credentials="xyz")
    with pytest.raises(HTTPException) as exc_info:
        require_student(credentials=invalid_creds)
    assert exc_info.value.status_code == 401


def test_authenticated_request_succeeds_and_forwards_payload():
    """Verify that an authenticated request succeeds and forwards all fields."""
    mock_service = MagicMock(spec=StudyAssistantService)
    expected_response = AssistantQueryResponse(
        answer="Newton's second law is F = ma [1].",
        intent="learning_help",
        citations=[
            Citation(
                citation_id=1,
                material_id=10,
                filename="physics.pdf",
                page_number=5,
                chunk_index=2,
            )
        ],
        sources_used=1,
    )
    mock_service.ask.return_value = expected_response

    auth_student = {
        "student_id": 42,
        "full_name": "Test Student",
        "email": "student42@example.com",
    }
    payload = AssistantQueryRequest(message="What is Newton's second law?", top_k=3)

    result = ask_assistant(payload=payload, student=auth_student, service=mock_service)

    assert result == expected_response
    assert result.answer == "Newton's second law is F = ma [1]."
    assert result.intent == "learning_help"
    assert len(result.citations) == 1
    assert result.sources_used == 1

    # Verify exact argument forwarding to service.ask
    mock_service.ask.assert_called_once_with(
        student_id=42,
        query="What is Newton's second law?",
        top_k=3,
    )


def test_request_cannot_supply_or_override_student_id():
    """Verify that student_id cannot be supplied or spoofed in request payload."""
    # 1. student_id is not an accepted field in the request schema
    assert "student_id" not in AssistantQueryRequest.model_fields

    # 2. Even if extra parameters are passed in a dict, endpoint uses student["student_id"]
    mock_service = MagicMock(spec=StudyAssistantService)
    mock_service.ask.return_value = AssistantQueryResponse(
        answer="Verified.",
        intent="general_chat",
        citations=[],
        sources_used=0,
    )

    auth_student = {
        "student_id": 7,
        "full_name": "Authenticated Student",
        "email": "student7@example.com",
    }
    payload = AssistantQueryRequest(message="Hello mentor", top_k=2)

    ask_assistant(payload=payload, student=auth_student, service=mock_service)

    # Must be 7, not any other ID
    assert mock_service.ask.call_args.kwargs["student_id"] == 7


def test_invalid_request_schema_rejections():
    """Verify that invalid payloads raise ValidationError (handled as 422 by FastAPI)."""
    # 1. Empty message
    with pytest.raises(ValidationError):
        AssistantQueryRequest(message="")

    # 2. Message exceeding 2000 characters
    with pytest.raises(ValidationError):
        AssistantQueryRequest(message="a" * 2001)

    # 3. top_k below 1
    with pytest.raises(ValidationError):
        AssistantQueryRequest(message="Valid query", top_k=0)

    # 4. top_k above 20
    with pytest.raises(ValidationError):
        AssistantQueryRequest(message="Valid query", top_k=21)


def test_service_unexpected_error_handled_as_500_without_leakage():
    """Verify that unexpected service errors produce 500 without leaking internal details."""
    mock_service = MagicMock(spec=StudyAssistantService)
    mock_service.ask.side_effect = RuntimeError(
        "Critical internal database connection failure: credentials=admin:secret_pass_123"
    )

    auth_student = {
        "student_id": 99,
        "full_name": "Error Student",
        "email": "err@example.com",
    }
    payload = AssistantQueryRequest(message="Trigger failure")

    with pytest.raises(HTTPException) as exc_info:
        ask_assistant(payload=payload, student=auth_student, service=mock_service)

    assert exc_info.value.status_code == 500
    # Must NOT leak secret or internal traceback details
    assert "secret_pass_123" not in exc_info.value.detail
    assert "Critical internal" not in exc_info.value.detail
    assert exc_info.value.detail == "An error occurred while processing the assistant query."


def test_service_value_error_handled_as_400():
    """Verify that client/input ValueError from service raises HTTP 400."""
    mock_service = MagicMock(spec=StudyAssistantService)
    mock_service.ask.side_effect = ValueError("query must be a non-empty string")

    auth_student = {
        "student_id": 1,
        "full_name": "Test Student",
        "email": "test@example.com",
    }
    payload = AssistantQueryRequest(message="Test")

    with pytest.raises(HTTPException) as exc_info:
        ask_assistant(payload=payload, student=auth_student, service=mock_service)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "query must be a non-empty string"


def test_uninitialized_service_dependency_raises_503():
    """Verify that get_study_assistant_service raises 503 when uninitialized."""
    set_study_assistant_service(None)

    with pytest.raises(HTTPException) as exc_info:
        get_study_assistant_service()

    assert exc_info.value.status_code == 503
    assert "not initialized" in exc_info.value.detail


def test_set_study_assistant_service_wires_dependency():
    """Verify that set_study_assistant_service allows wiring and resetting the singleton."""
    mock_service = MagicMock(spec=StudyAssistantService)
    set_study_assistant_service(mock_service)

    resolved = get_study_assistant_service()
    assert resolved is mock_service

    # Resetting restores 503 safety behavior
    set_study_assistant_service(None)
    with pytest.raises(HTTPException) as exc_info:
        get_study_assistant_service()
    assert exc_info.value.status_code == 503
