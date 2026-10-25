from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.otp.service import (
    MAX_ATTEMPTS,
    generate_otp,
    hash_otp,
    is_otp_expired,
    verify_otp_hash,
)


def test_generated_otp_has_six_digits():
    otp = generate_otp()
    assert len(otp) == 6
    assert otp.isdigit()


def test_otp_hash_verifies_correct_code():
    with patch("app.otp.service.settings.otp_pepper", "test-pepper"):
        hashed = hash_otp("123456")
        assert verify_otp_hash("123456", hashed)
        assert not verify_otp_hash("654321", hashed)


def test_otp_expiry_time_is_in_the_future():
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expiry = now + timedelta(minutes=5)
    assert not is_otp_expired(expiry)


def test_expired_otp_is_rejected():
    expiry = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
    assert is_otp_expired(expiry)


def test_maximum_attempts_is_five():
    assert MAX_ATTEMPTS == 5
