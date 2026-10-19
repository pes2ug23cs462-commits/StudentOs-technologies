
import os

from fastapi import HTTPException


async def send_sms(phone_number: str, message: str) -> None:
    """SMS provider integration will be added after selection."""
    provider = os.getenv("SMS_PROVIDER", "").strip().lower()

    if not provider:
        raise HTTPException(
            status_code=503,
            detail="SMS delivery is not configured yet.",
        )

    raise HTTPException(
        status_code=503,
        detail="The SMS provider is not integrated yet.",
    )
