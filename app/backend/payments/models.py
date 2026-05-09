from django.db import models


class Payment(models.Model):
    RECIPIENT_TYPES = [
        ("Address", "Address"),
        ("Username", "Username"),
        ("Identifier", "Identifier"),
    ]
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Claimed", "Claimed"),
        ("Cancelled", "Cancelled"),
    ]

    payment_id = models.BigIntegerField(unique=True)
    sender = models.CharField(max_length=44)
    # Pubkey::default() (all zeros) for Identifier payments
    recipient = models.CharField(max_length=44, blank=True)
    # hex of the 32-byte on-chain recipient_identifier
    recipient_identifier = models.CharField(max_length=64)
    recipient_type = models.CharField(max_length=10, choices=RECIPIENT_TYPES)
    # raw USDC units; divide by 1_000_000 for human-readable amount
    amount = models.BigIntegerField()
    token_mint = models.CharField(max_length=44)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Pending")
    on_chain_created_at = models.DateTimeField()
    on_chain_expires_at = models.DateTimeField()
    note = models.TextField(blank=True)
    tx_signature = models.CharField(max_length=128, unique=True)
    notification_sent = models.BooleanField(default=False)
    synced_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-on_chain_created_at"]
        indexes = [
            models.Index(fields=["recipient_identifier", "status"]),
            models.Index(fields=["sender"]),
        ]

    @property
    def amount_usdc(self) -> float:
        return self.amount / 1_000_000


class BridgeTransaction(models.Model):
    """
    Tracks a LiFi cross-chain bridge transaction initiated by a sender.
    The bridge moves funds from an EVM chain to Solana USDC.
    Once status == DONE the sender's Solana wallet has USDC and can call send_payment.
    """
    BRIDGE_STATUS = [
        ("PENDING", "Pending"),
        ("DONE", "Done"),
        ("FAILED", "Failed"),
        ("INVALID", "Invalid"),
    ]

    # The EVM transaction hash that initiated the bridge
    bridge_tx_hash = models.CharField(max_length=128, unique=True)
    from_chain_id = models.IntegerField()       # e.g. 1 = Ethereum, 137 = Polygon
    to_chain_id = models.IntegerField()         # 1151111081099710 = Solana (LiFi ID)
    from_token = models.CharField(max_length=64)
    to_token = models.CharField(max_length=64)
    amount_usd = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    sender_evm_address = models.CharField(max_length=42)
    sender_solana_address = models.CharField(max_length=44, blank=True)
    bridge_name = models.CharField(max_length=64, blank=True)   # e.g. "stargate"
    tool = models.CharField(max_length=64, blank=True)           # e.g. "uniswap"
    status = models.CharField(max_length=10, choices=BRIDGE_STATUS, default="PENDING")
    # Solana tx signature once the bridge delivers funds on-chain
    solana_tx_signature = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # How many times we've polled LiFi for this tx (stops polling after max retries)
    poll_count = models.IntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=["status", "poll_count"])]

    def __str__(self):
        return f"{self.bridge_tx_hash[:12]}… ({self.status})"


class SolanaListenerState(models.Model):
    """Singleton that tracks the last processed signature for the event poller."""
    last_signature = models.CharField(max_length=128, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get(cls) -> "SolanaListenerState":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
