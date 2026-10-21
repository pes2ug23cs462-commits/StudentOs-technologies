
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.api.auth import require_student


def override_require_student():
    return {
        "student_id": 1,
        "full_name": "Test Student",
        "email": "test@example.com",
    }


app.dependency_overrides[require_student] = override_require_student
client = TestClient(app)


def test_get_student_profile_success():
    row = {
        "student_id": 1,
        "full_name": "Test Student",
        "email": "test@example.com",
        "field_of_study": "Computer Science",
        "academic_year": "3rd Year",
        "goals": '["Improve coding"]',
        "preferences": '{"study_mode": "visual"}',
        "profile_completed": 1,
    }

    mock_connection = MagicMock()
    mock_connection.execute.return_value.mappings.return_value.first.return_value = row

    with patch("app.api.students.engine.connect") as mock_connect:
        mock_connect.return_value.__enter__.return_value = mock_connection
        response = client.get("/api/students/1")

    assert response.status_code == 200
    data = response.json()
    assert data["student_id"] == 1
    assert data["full_name"] == "Test Student"
    assert data["goals"] == ["Improve coding"]
    assert data["preferences"] == {"study_mode": "visual"}


def test_get_missing_student_returns_404():
    mock_connection = MagicMock()
    mock_connection.execute.return_value.mappings.return_value.first.return_value = None

    with patch("app.api.students.engine.connect") as mock_connect:
        mock_connect.return_value.__enter__.return_value = mock_connection
        # Student 1 is authenticated, but the mocked database has no matching row.
        response = client.get("/api/students/1")

    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found"


def test_get_student_context_success():
    profile = {
        "student_id": 1,
        "full_name": "Test Student",
        "email": "test@example.com",
        "field_of_study": "Computer Science",
        "academic_year": "3rd Year",
        "goals": '["Improve coding"]',
        "preferences": '{"study_mode": "visual"}',
        "profile_completed": 1,
    }

    assessment = {
        "assignment_id": 101,
        "score": 18,
        "max_score": 20,
        "completed_at": "2026-10-17T13:45:23",
    }

    mock_connection = MagicMock()
    mock_connection.execute.return_value.mappings.return_value.first.return_value = profile
    mock_connection.execute.return_value.mappings.return_value.all.return_value = [
        assessment
    ]

    with patch(
        "app.context.student_context_builder.engine.connect"
    ) as mock_connect:
        mock_connect.return_value.__enter__.return_value = mock_connection
        response = client.get("/api/students/1/context")

    assert response.status_code == 200
    data = response.json()
    assert data["student_id"] == 1
    assert data["assessments"][0]["percentage"] == 90.0
    assert data["average_percentage"] == 90.0
    assert "Assessment history" in data["llm_context"]


def test_get_student_tasks_returns_list():
    with patch("app.api.tasks.engine.connect") as mock_connect:
        mock_connection = mock_connect.return_value.__enter__.return_value
        mock_connection.execute.return_value.first.return_value = (1,)
        mock_connection.execute.return_value.mappings.return_value.all.return_value = [
            {
                "task_id": 1,
                "student_id": 1,
                "title": "Complete DBMS assignment",
                "description": "Finish database lab work",
                "due_date": None,
                "priority": "high",
                "status": "pending",
                "created_at": None,
                "updated_at": None,
            }
        ]

        response = client.get("/api/students/1/tasks")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Complete DBMS assignment"
    assert data[0]["status"] == "pending"


def test_create_student_task_success():
    task_row = {
        "task_id": 10,
        "student_id": 1,
        "title": "Complete DBMS assignment",
        "description": "Finish lab work",
        "due_date": None,
        "priority": "high",
        "status": "pending",
        "created_at": None,
        "updated_at": None,
    }

    mock_connection = MagicMock()
    mock_connection.execute.return_value.first.return_value = (1,)
    mock_connection.execute.return_value.lastrowid = 10
    mock_connection.execute.return_value.mappings.return_value.one.return_value = (
        task_row
    )

    with patch("app.api.tasks.engine.begin") as mock_begin:
        mock_begin.return_value.__enter__.return_value = mock_connection
        response = client.post(
            "/api/students/1/tasks",
            json={
                "title": "Complete DBMS assignment",
                "description": "Finish lab work",
                "priority": "high",
                "status": "pending",
            },
        )

    assert response.status_code == 200
    assert response.json()["task_id"] == 10
    assert response.json()["title"] == "Complete DBMS assignment"


def test_update_student_task_success():
    updated_row = {
        "task_id": 10,
        "student_id": 1,
        "title": "Complete DBMS assignment",
        "description": "Finish lab work",
        "due_date": None,
        "priority": "high",
        "status": "completed",
        "created_at": None,
        "updated_at": None,
    }

    mock_connection = MagicMock()
    mock_connection.execute.return_value.rowcount = 1
    mock_connection.execute.return_value.mappings.return_value.one.return_value = (
        updated_row
    )

    with patch("app.api.tasks.engine.begin") as mock_begin:
        mock_begin.return_value.__enter__.return_value = mock_connection
        response = client.put(
            "/api/students/1/tasks/10",
            json={"status": "completed"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_delete_student_task_success():
    mock_connection = MagicMock()
    mock_connection.execute.return_value.rowcount = 1

    with patch("app.api.tasks.engine.begin") as mock_begin:
        mock_begin.return_value.__enter__.return_value = mock_connection
        response = client.delete("/api/students/1/tasks/10")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Task deleted successfully",
        "task_id": 10,
    }


def test_delete_missing_student_task_returns_404():
    mock_connection = MagicMock()
    mock_connection.execute.return_value.rowcount = 0

    with patch("app.api.tasks.engine.begin") as mock_begin:
        mock_begin.return_value.__enter__.return_value = mock_connection
        response = client.delete("/api/students/1/tasks/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"


def test_task_routes_reject_different_student():
    response = client.get("/api/students/2/tasks")

    assert response.status_code == 403
    assert response.json()["detail"] == "You can only access your own tasks"
