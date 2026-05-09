from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.services.solana_tx import compute_identifier_hash_hex
from payments.models import BridgeTransaction, Payment
from payments.serializers import BridgeTransactionSerializer, PaymentSerializer


class PendingPaymentsView(APIView):
    """
    GET /api/payments/pending/?identifier=<email_or_phone>
    Returns all Pending payments for a given email or phone number.
    """

    def get(self, request):
        identifier = request.query_params.get("identifier", "").strip()
        if not identifier:
            return Response(
                {"detail": "identifier query param required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        identifier_hash = compute_identifier_hash_hex(identifier)
        payments = Payment.objects.filter(
            recipient_identifier=identifier_hash, status="Pending"
        )
        return Response(PaymentSerializer(payments, many=True).data)


class PaymentsByWalletView(APIView):
    """
    GET /api/payments/wallet/<wallet_address>/
    Returns all payments sent or pending for a wallet.
    """

    def get(self, request, wallet_address):
        payments = Payment.objects.filter(sender=wallet_address)
        return Response(PaymentSerializer(payments, many=True).data)


class PaymentDetailView(APIView):
    """GET /api/payments/<payment_id>/"""

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(payment_id=payment_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentSerializer(payment).data)


class IdentifierHashView(APIView):
    """
    POST /api/payments/identifier-hash/
    Utility: given an email or phone, return the SHA-256 hash
    the frontend should pass to send_payment as recipient_identifier.
    """

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        if not identifier:
            return Response({"detail": "identifier required."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "identifier": identifier,
                "identifier_hash": compute_identifier_hash_hex(identifier),
                "identifier_hash_bytes": list(bytes.fromhex(compute_identifier_hash_hex(identifier))),
            }
        )


class BridgeTransactionView(APIView):
    """
    POST /api/payments/bridge/
    Called by the frontend immediately after the user submits a LiFi bridge tx.
    Registers the bridge so the backend can track it and notify when complete.

    Body:
    {
      "bridge_tx_hash": "0xabc...",
      "from_chain_id": 1,
      "to_chain_id": 1151111081099710,
      "from_token": "0xA0b86991...",
      "to_token": "EPjFWdd5...",
      "amount_usd": "49.50",
      "sender_evm_address": "0xDe...",
      "sender_solana_address": "9ckS1i...",
      "bridge_name": "stargate"       (optional)
    }
    """

    def post(self, request):
        tx_hash = request.data.get("bridge_tx_hash", "").strip()
        if not tx_hash:
            return Response({"detail": "bridge_tx_hash is required."}, status=status.HTTP_400_BAD_REQUEST)

        bridge_tx, created = BridgeTransaction.objects.get_or_create(
            bridge_tx_hash=tx_hash,
            defaults={
                "from_chain_id": request.data.get("from_chain_id", 1),
                "to_chain_id": request.data.get("to_chain_id", 1151111081099710),
                "from_token": request.data.get("from_token", ""),
                "to_token": request.data.get("to_token", ""),
                "amount_usd": request.data.get("amount_usd") or None,
                "sender_evm_address": request.data.get("sender_evm_address", ""),
                "sender_solana_address": request.data.get("sender_solana_address", ""),
                "bridge_name": request.data.get("bridge_name", ""),
            },
        )
        return Response(
            BridgeTransactionSerializer(bridge_tx).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class BridgeStatusView(APIView):
    """
    GET /api/payments/bridge/<bridge_tx_hash>/
    Frontend polls this to check whether the bridge is done.
    When status == DONE the frontend can proceed with send_payment on Solana.
    """

    def get(self, request, bridge_tx_hash):
        try:
            bridge_tx = BridgeTransaction.objects.get(bridge_tx_hash=bridge_tx_hash)
        except BridgeTransaction.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BridgeTransactionSerializer(bridge_tx).data)
