
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.auth import create_session, require_student
from app.db.database import engine
from app.otp.service import generate_otp, otp_expiry_time
from app.otp.storage import save_otp_challenge, consume_otp_challenge
from app.otp.sms import send_sms
from app.schemas.otp import OTPRequest, OTPVerifyRequest

router = APIRouter(
    prefix="/api/auth/otp",
    tags=["OTP Authentication"],
)


@router.post("/request")
async def request_otp(payload: OTPRequest):
    """Request an OTP for passwordless login."""

    if payload.purpose == "registration":
        raise HTTPException(
            status_code=401,
            detail="Registration OTP requires an authenticated session.",
        )

    with engine.connect() as connection:
        phone = connection.execute(
            text("""
                SELECT student_id
                FROM student_phone_numbers
                WHERE phone_number = :phone
                  AND is_verified = TRUE
            """),
            {"phone": payload.phone_number},
        ).first()

    # Avoid revealing whether a phone number has an account.
    if phone is None:
        return {
            "message": "If the number is eligible, an OTP can be sent."
        }

    otp = generate_otp()

    save_otp_challenge(
        phone_number=payload.phone_number,
        purpose="login",
        otp=otp,
        expires_at=otp_expiry_time(),
    )

    # The SMS adapter currently returns 503 until a real provider
    # has been configured. Do not report a fake delivery success.
    await send_sms(
        payload.phone_number,
        f"Your StudentOS login code is {otp}. It expires in 5 minutes.",
    )

    return {"message": "OTP sent successfully"}


@router.post("/verify")
def verify_otp(payload: OTPVerifyRequest):
    """Verify a login OTP and create a session."""

    if payload.purpose != "login":
        raise HTTPException(
            status_code=400,
            detail="Registration verification requires an authenticated session.",
        )

    with engine.connect() as connection:
        phone = connection.execute(
            text("""
                SELECT student_id
                FROM student_phone_numbers
                WHERE phone_number = :phone
                  AND is_verified = TRUE
            """),
            {"phone": payload.phone_number},
        ).first()

    if phone is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP",
        )

    valid = consume_otp_challenge(
        phone_number=payload.phone_number,
        purpose="login",
        otp=payload.code,
    )

    if not valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP",
        )

    session = create_session(phone.student_id)

    return {
        "message": "Signed in successfully",
        **session,
    }


@router.post("/registration/request")
async def request_registration_otp(
    payload: OTPRequest,
    student: dict = Depends(require_student),
):
    """Request phone verification for the authenticated student."""

    if payload.purpose != "registration":
        raise HTTPException(
            status_code=400,
            detail="Purpose must be registration",
        )

    with engine.connect() as connection:
        existing = connection.execute(
            text("""
                SELECT student_id
                FROM student_phone_numbers
                WHERE phone_number = :phone
            """),
            {"phone": payload.phone_number},
        ).first()

    if existing and existing.student_id != student["student_id"]:
        raise HTTPException(
            status_code=409,
            detail="This phone number is already registered",
        )

    otp = generate_otp()

    save_otp_challenge(
        phone_number=payload.phone_number,
        purpose="registration",
        otp=otp,
        expires_at=otp_expiry_time(),
    )

    await send_sms(
        payload.phone_number,
        f"Your StudentOS verification code is {otp}. "
        "It expires in 5 minutes.",
    )

    return {"message": "Verification code requested"}


@router.post("/registration/verify")
def verify_registration_otp(
    payload: OTPVerifyRequest,
    student: dict = Depends(require_student),
):
    """Verify a registration OTP and link the phone to this student."""

    if payload.purpose != "registration":
        raise HTTPException(
            status_code=400,
            detail="Purpose must be registration",
        )

    valid = consume_otp_challenge(
        phone_number=payload.phone_number,
        purpose="registration",
        otp=payload.code,
    )

    if not valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    try:
        with engine.begin() as connection:
            existing = connection.execute(
                text("""
                    SELECT student_id
                    FROM student_phone_numbers
                    WHERE phone_number = :phone
                """),
                {"phone": payload.phone_number},
            ).first()

            if existing and existing.student_id != student["student_id"]:
                raise HTTPException(
                    status_code=409,
                    detail="This phone number is already registered",
                )

            if existing:
                connection.execute(
                    text("""
                        UPDATE student_phone_numbers
                        SET is_verified = TRUE,
                            verified_at = :verified_at
                        WHERE phone_number = :phone
                          AND student_id = :student_id
                    """),
                    {
                        "phone": payload.phone_number,
                        "student_id": student["student_id"],
                        "verified_at": now,
                    },
                )
            else:
                connection.execute(
                    text("""
                        INSERT INTO student_phone_numbers (
                            student_id,
                            phone_number,
                            is_verified,
                            verified_at
                        )
                        VALUES (
                            :student_id,
                            :phone,
                            TRUE,
                            :verified_at
                        )
                    """),
                    {
                        "student_id": student["student_id"],
                        "phone": payload.phone_number,
                        "verified_at": now,
                    },
                )

    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="This phone number is already registered",
        ) from exc

    return {"message": "Phone number verified successfully"}
