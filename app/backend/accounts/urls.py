from django.urls import path

from accounts.views import ConfirmOTPView, ProfileView, RegisterView, SendOTPView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("otp/send/", SendOTPView.as_view(), name="otp-send"),
    path("otp/confirm/", ConfirmOTPView.as_view(), name="otp-confirm"),
    path("profile/<str:wallet_address>/", ProfileView.as_view(), name="profile"),
]
