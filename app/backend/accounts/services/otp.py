import hashlib
import random
import string
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from accounts.models import OTPVerification


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def send_otp(wallet_address: str, identifier: str, identifier_type: str) -> None:
    code = "".join(random.choices(string.digits, k=6))
    OTPVerification.objects.create(
        wallet_address=wallet_address,
        identifier=identifier,
        identifier_type=identifier_type,
        code_hash=_hash_code(code),
        expires_at=timezone.now() + timedelta(seconds=settings.OTP_EXPIRY_SECONDS),
    )

    if identifier_type == "email":
        send_mail(
            subject="Your CrossPay verification code",
            message=f"Your verification code is: {code}\n\nIt expires in 10 minutes.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[identifier],
            fail_silently=False,
        )
    # SMS support: swap in Twilio here if identifier_type == "phone"


def verify_otp(wallet_address: str, identifier: str, code: str) -> bool:
    record = (
        OTPVerification.objects.filter(
            wallet_address=wallet_address,
            identifier=identifier,
            code_hash=_hash_code(code),
            is_used=False,
        )
        .order_by("-created_at")
        .first()
    )
    if not record or record.is_expired:
        return False
    record.is_used = True
    record.save(update_fields=["is_used"])
    return True
