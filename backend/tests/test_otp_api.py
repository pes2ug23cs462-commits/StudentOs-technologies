from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_otp_request_rejects_invalid_phone_format():
    response = client.post(
        "/api/auth/otp/request",
        json={
            "phone_number": "invalid-phone",
            "purpose": "login",
        },
    )

    assert response.status_code == 422


def test_otp_request_for_unregistered_phone_is_generic():
    with patch("app.api.otp.engine.connect") as mock_connect:
        mock_connection = mock_connect.return_value.__enter__.return_value
        mock_connection.execute.return_value.first.return_value = None

        response = client.post(
            "/api/auth/otp/request",
            json={
                "phone_number": "+919876543210",
                "purpose": "login",
            },
        )

    assert response.status_code == 200
    assert response.json()["message"] == (
        "If the number is eligible, an OTP can be sent."
    )
