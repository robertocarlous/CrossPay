from django.urls import path

from payments.views import (
    BridgeStatusView,
    BridgeTransactionView,
    IdentifierHashView,
    PaymentDetailView,
    PaymentsByWalletView,
    PendingPaymentsView,
)

urlpatterns = [
    path("pending/", PendingPaymentsView.as_view(), name="pending-payments"),
    path("wallet/<str:wallet_address>/", PaymentsByWalletView.as_view(), name="wallet-payments"),
    path("<int:payment_id>/", PaymentDetailView.as_view(), name="payment-detail"),
    path("identifier-hash/", IdentifierHashView.as_view(), name="identifier-hash"),
    path("bridge/", BridgeTransactionView.as_view(), name="bridge-submit"),
    path("bridge/<str:bridge_tx_hash>/", BridgeStatusView.as_view(), name="bridge-status"),
]
