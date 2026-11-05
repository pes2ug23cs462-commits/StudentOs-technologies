import os
import pytest

# Unconditionally force hermetic test environment variables.
# Direct assignment prevents external developer or production environment variables from leaking into tests.
os.environ["DATABASE_URL"] = (
    "mysql+pymysql://test_user:test_pass@localhost:3306/test_studentos_db"
)
os.environ["OTP_PEPPER"] = "test-otp-pepper-secret-for-testing"


@pytest.fixture(autouse=True)
def reset_dependency_overrides():
    """Ensure FastAPI dependency overrides do not leak between test cases."""
    from app.main import app

    original_overrides = dict(app.dependency_overrides)
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(original_overrides)
