
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.auth import require_student
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_auth_override():
    app.dependency_overrides.pop(require_student, None)
    yield
    app.dependency_overrides.pop(require_student, None)


def authenticated_student():
    return {
        "student_id": 7,
        "full_name": "Test Student",
        "email": "test@example.com",
    }


def sample_plan(status="DRAFT"):
    now = datetime(2026, 10, 20, 10, 0, 0)
    return {
        "plan_id": 5,
        "student_id": 7,
        "title": "Python Roadmap",
        "goal": "Learn Python",
        "duration_weeks": 8,
        "status": status,
        "created_at": now,
        "updated_at": now,
    }


def test_create_plan_requires_authentication():
    response = client.post(
        "/api/plans",
        json={
            "title": "Python Roadmap",
            "goal": "Learn Python",
            "duration_weeks": 8,
        },
    )

    assert response.status_code == 401


def test_create_plan_success():
    app.dependency_overrides[require_student] = authenticated_student

    connection = MagicMock()
    insert_result = MagicMock()
    insert_result.lastrowid = 5

    fetched_result = MagicMock()
    fetched_result.mappings.return_value.one.return_value = sample_plan()

    connection.execute.side_effect = [insert_result, fetched_result]

    with patch("app.api.plans.engine.begin") as mock_begin:
        mock_begin.return_value.__enter__.return_value = connection

        response = client.post(
            "/api/plans",
            json={
                "title": "Python Roadmap",
                "goal": "Learn Python",
                "duration_weeks": 8,
            },
        )

    assert response.status_code == 201
    assert response.json()["plan_id"] == 5
    assert response.json()["student_id"] == 7
    assert response.json()["status"] == "DRAFT"

    insert_params = connection.execute.call_args_list[0].args[1]
    assert insert_params["student_id"] == 7


def test_create_plan_rejects_invalid_duration():
    app.dependency_overrides[require_student] = authenticated_student

    response = client.post(
        "/api/plans",
        json={
            "title": "Python Roadmap",
            "goal": "Learn Python",
            "duration_weeks": 0,
        },
    )

    assert response.status_code == 422


def test_approve_plan_requires_review_status():
    app.dependency_overrides[require_student] = authenticated_student

    connection = MagicMock()
    current_result = MagicMock()
    current_result.mappings.return_value.first.return_value = {
        "status": "DRAFT"
    }
    connection.execute.return_value = current_result

    with patch("app.api.plans.engine.begin") as mock_begin:
        mock_begin.return_value.__enter__.return_value = connection

        response = client.post("/api/plans/5/approve")

    assert response.status_code == 409
    assert connection.execute.call_count == 1


def test_activate_plan_requires_approved_status():
    app.dependency_overrides[require_student] = authenticated_student

    connection = MagicMock()
    current_result = MagicMock()
    current_result.mappings.return_value.first.return_value = {
        "status": "REVIEW"
    }
    connection.execute.return_value = current_result

    with patch("app.api.plans.engine.begin") as mock_begin:
        mock_begin.return_value.__enter__.return_value = connection

        response = client.post("/api/plans/5/activate")

    assert response.status_code == 409
    assert connection.execute.call_count == 1
