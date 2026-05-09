from rest_framework import serializers

from accounts.models import User


class RegisterSerializer(serializers.Serializer):
    wallet_address = serializers.CharField(max_length=44)
    username = serializers.CharField(max_length=32)


class SendOTPSerializer(serializers.Serializer):
    wallet_address = serializers.CharField(max_length=44)
    identifier = serializers.CharField()
    identifier_type = serializers.ChoiceField(choices=["email", "phone"])


class ConfirmOTPSerializer(serializers.Serializer):
    wallet_address = serializers.CharField(max_length=44)
    identifier = serializers.CharField()
    identifier_type = serializers.ChoiceField(choices=["email", "phone"])
    code = serializers.CharField(min_length=6, max_length=6)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["wallet_address", "username", "has_identifier", "created_at"]
