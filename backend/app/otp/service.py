
import hashlib
import hmac
import secrets

from app.db.database import settings
from datetime import datetime, timedelta, timezone

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 5


def _otp_pepper() -> bytes:
    """Load the private OTP hashing secret from application settings."""
    pepper = settings.otp_pepper

    if not pepper:
        raise RuntimeError("OTP_PEPPER must be configured.")

    return pepper.encode("utf-8")


def generate_otp() -> str:
    """Generate a cryptographically secure six-digit OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    """Create a keyed hash without storing the plaintext OTP."""
    return hmac.new(
        _otp_pepper(),
        otp.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_otp_hash(otp: str, stored_hash: str) -> bool:
    """Compare the supplied OTP against its stored hash."""
    return hmac.compare_digest(hash_otp(otp), stored_hash)


def otp_expiry_time() -> datetime:
    """Return a database-compatible UTC expiry time."""
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        minutes=OTP_EXPIRY_MINUTES
    )


def is_otp_expired(expires_at: datetime) -> bool:
    """Check whether an OTP has expired."""
    return datetime.now(timezone.utc).replace(tzinfo=None) >= expires_at
