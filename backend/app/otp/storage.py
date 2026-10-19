
from datetime import datetime, timezone

from sqlalchemy import text

from app.db.database import engine
from app.otp.service import (
    MAX_ATTEMPTS,
    hash_otp,
    is_otp_expired,
    verify_otp_hash,
)


def save_otp_challenge(
    phone_number: str,
    purpose: str,
    otp: str,
    expires_at: datetime,
) -> None:
    """Save a new OTP challenge and invalidate older unused ones."""
    if purpose not in {"registration", "login"}:
        raise ValueError("Unsupported OTP purpose.")

    otp_hash = hash_otp(otp)

    with engine.begin() as connection:
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        connection.execute(
            text("""
                UPDATE otp_challenges
                SET consumed_at = :now
                WHERE phone_number = :phone_number
                  AND purpose = :purpose
                  AND consumed_at IS NULL
            """),
            {
                "now": now,
                "phone_number": phone_number,
                "purpose": purpose,
            },
        )

        connection.execute(
            text("""
                INSERT INTO otp_challenges
                    (phone_number, purpose, otp_hash, expires_at)
                VALUES
                    (:phone_number, :purpose, :otp_hash, :expires_at)
            """),
            {
                "phone_number": phone_number,
                "purpose": purpose,
                "otp_hash": otp_hash,
                "expires_at": expires_at,
            },
        )


def consume_otp_challenge(
    phone_number: str,
    purpose: str,
    otp: str,
) -> bool:
    """Validate and consume the newest unused OTP challenge."""
    if purpose not in {"registration", "login"}:
        return False

    with engine.begin() as connection:
        challenge = connection.execute(
            text("""
                SELECT challenge_id, otp_hash, expires_at, attempts
                FROM otp_challenges
                WHERE phone_number = :phone_number
                  AND purpose = :purpose
                  AND consumed_at IS NULL
                ORDER BY challenge_id DESC
                LIMIT 1
                FOR UPDATE
            """),
            {
                "phone_number": phone_number,
                "purpose": purpose,
            },
        ).mappings().first()

        if challenge is None:
            return False

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        challenge_id = challenge["challenge_id"]
        attempts = challenge["attempts"]

        if is_otp_expired(challenge["expires_at"]) or attempts >= MAX_ATTEMPTS:
            connection.execute(
                text("""
                    UPDATE otp_challenges
                    SET consumed_at = :now
                    WHERE challenge_id = :challenge_id
                """),
                {"now": now, "challenge_id": challenge_id},
            )
            return False

        if not verify_otp_hash(otp, challenge["otp_hash"]):
            new_attempts = attempts + 1

            connection.execute(
                text("""
                    UPDATE otp_challenges
                    SET attempts = :attempts,
                        consumed_at = :consumed_at
                    WHERE challenge_id = :challenge_id
                """),
                {
                    "attempts": new_attempts,
                    "consumed_at": now if new_attempts >= MAX_ATTEMPTS else None,
                    "challenge_id": challenge_id,
                },
            )
            return False

        connection.execute(
            text("""
                UPDATE otp_challenges
                SET consumed_at = :now
                WHERE challenge_id = :challenge_id
            """),
            {"now": now, "challenge_id": challenge_id},
        )

        return True
