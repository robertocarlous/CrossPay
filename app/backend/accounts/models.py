from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, wallet_address, username, **extra):
        if not wallet_address:
            raise ValueError("wallet_address is required")
        user = self.model(wallet_address=wallet_address, username=username, **extra)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, wallet_address, username, password=None, **extra):
        user = self.create_user(wallet_address, username, **extra)
        user.is_staff = True
        user.is_superuser = True
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    wallet_address = models.CharField(max_length=44, unique=True)
    username = models.CharField(max_length=32, unique=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    # hex of SHA-256(email or phone) — mirrors on-chain identifier_hash
    identifier_hash = models.CharField(max_length=64, blank=True)
    has_identifier = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "wallet_address"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    def __str__(self):
        return f"@{self.username} ({self.wallet_address[:8]}…)"


class OTPVerification(models.Model):
    IDENTIFIER_TYPES = [("email", "Email"), ("phone", "Phone")]

    wallet_address = models.CharField(max_length=44)
    identifier = models.CharField(max_length=255)
    identifier_type = models.CharField(max_length=5, choices=IDENTIFIER_TYPES)
    # stored as hex of SHA-256 of the raw code
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["wallet_address", "identifier", "is_used"])]

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
