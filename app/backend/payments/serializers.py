from rest_framework import serializers

from payments.models import BridgeTransaction, Payment


class PaymentSerializer(serializers.ModelSerializer):
    amount_usdc = serializers.FloatField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "payment_id",
            "sender",
            "recipient",
            "recipient_identifier",
            "recipient_type",
            "amount",
            "amount_usdc",
            "token_mint",
            "status",
            "on_chain_created_at",
            "on_chain_expires_at",
            "note",
            "tx_signature",
        ]


class BridgeTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BridgeTransaction
        fields = [
            "bridge_tx_hash",
            "from_chain_id",
            "to_chain_id",
            "from_token",
            "to_token",
            "amount_usd",
            "sender_evm_address",
            "sender_solana_address",
            "bridge_name",
            "status",
            "solana_tx_signature",
            "poll_count",
            "created_at",
            "updated_at",
        ]
