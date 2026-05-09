from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.serializers import ConfirmOTPSerializer, RegisterSerializer, SendOTPSerializer, UserSerializer
from accounts.services.otp import send_otp, verify_otp
from accounts.services.solana_tx import (
    compute_identifier_hash_hex,
    get_user_profile_pda,
    get_username_index_pda,
)


class RegisterView(APIView):
    """
    Create a user record (off-chain). Call this after the user submits
    register_user on-chain so we can resolve their username for payments.
    """

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        wallet = s.validated_data["wallet_address"]
        username = s.validated_data["username"].lower()

        user, created = User.objects.get_or_create(
            wallet_address=wallet,
            defaults={"username": username},
        )
        if not created and user.username != username:
            return Response(
                {"detail": "Wallet already registered with a different username."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SendOTPView(APIView):
    """Send a 6-digit OTP to the user's email or phone."""

    def post(self, request):
        s = SendOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        send_otp(
            wallet_address=s.validated_data["wallet_address"],
            identifier=s.validated_data["identifier"],
            identifier_type=s.validated_data["identifier_type"],
        )
        return Response({"detail": "OTP sent."})


class ConfirmOTPView(APIView):
    """
    Verify OTP and return the identifier hash + PDAs the frontend needs
    to build the update_identifier_hash transaction.
    """

    def post(self, request):
        s = ConfirmOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        wallet = s.validated_data["wallet_address"]
        identifier = s.validated_data["identifier"]
        identifier_type = s.validated_data["identifier_type"]
        code = s.validated_data["code"]

        if not verify_otp(wallet, identifier, code):
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        identifier_hash_hex = compute_identifier_hash_hex(identifier)

        # Persist verified identifier on the user record
        try:
            user = User.objects.get(wallet_address=wallet)
            field = "email" if identifier_type == "email" else "phone"
            setattr(user, field, identifier)
            user.identifier_hash = identifier_hash_hex
            user.has_identifier = True
            user.save(update_fields=[field, "identifier_hash", "has_identifier"])
        except User.DoesNotExist:
            pass

        return Response(
            {
                "identifier_hash": identifier_hash_hex,
                "identifier_hash_bytes": list(bytes.fromhex(identifier_hash_hex)),
                "user_profile_pda": get_user_profile_pda(settings.PROGRAM_ID, wallet),
                "hint": "Pass identifier_hash_bytes to update_identifier_hash on-chain.",
            }
        )


class ProfileView(APIView):
    """Fetch user profile by wallet address."""

    def get(self, request, wallet_address):
        try:
            user = User.objects.get(wallet_address=wallet_address)
        except User.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)
