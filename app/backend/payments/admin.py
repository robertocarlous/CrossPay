from django.contrib import admin

from payments.models import BridgeTransaction, Payment, SolanaListenerState


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["payment_id", "sender", "recipient_type", "amount_usdc", "status", "on_chain_created_at"]
    list_filter = ["status", "recipient_type"]
    search_fields = ["sender", "recipient", "recipient_identifier", "tx_signature"]
    readonly_fields = ["payment_id", "tx_signature", "synced_at"]


@admin.register(BridgeTransaction)
class BridgeTransactionAdmin(admin.ModelAdmin):
    list_display = ["bridge_tx_hash", "from_chain_id", "status", "amount_usd", "poll_count", "updated_at"]
    list_filter = ["status"]
    search_fields = ["bridge_tx_hash", "sender_evm_address", "sender_solana_address"]
    readonly_fields = ["poll_count", "created_at", "updated_at"]


@admin.register(SolanaListenerState)
class SolanaListenerStateAdmin(admin.ModelAdmin):
    list_display = ["last_signature", "updated_at"]
