"""
Polls Solana for PaymentCreated events emitted by the lifi program
and writes them into the Payment table.

Anchor events appear in transaction logs as:
  "Program data: <base64>"
where the base64 decodes to:
  8-byte discriminator  (sha256("event:PaymentCreated")[:8])
  borsh-encoded fields in struct-declaration order
"""

import base64
import hashlib
import logging
import struct
from datetime import datetime, timezone

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# sha256("event:PaymentCreated")[:8]
_PAYMENT_CREATED_DISC = hashlib.sha256(b"event:PaymentCreated").digest()[:8]


def _rpc(method: str, params: list) -> dict:
    resp = requests.post(
        settings.SOLANA_RPC_URL,
        json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def _parse_payment_created(data: bytes) -> dict | None:
    """
    PaymentCreated borsh layout (after discriminator):
      payment_id:             u64   (8 bytes LE)
      sender:                 Pubkey (32 bytes)
      recipient:              Pubkey (32 bytes)
      recipient_identifier:   [u8;32] (32 bytes)
      amount:                 u64   (8 bytes LE)
      token_mint:             Pubkey (32 bytes)
      expires_at:             i64   (8 bytes LE)
    Total after discriminator: 8+32+32+32+8+32+8 = 152 bytes
    """
    if len(data) < 8 or data[:8] != _PAYMENT_CREATED_DISC:
        return None

    body = data[8:]
    if len(body) < 152:
        return None

    offset = 0

    def read_u64():
        nonlocal offset
        val = struct.unpack_from("<Q", body, offset)[0]
        offset += 8
        return val

    def read_i64():
        nonlocal offset
        val = struct.unpack_from("<q", body, offset)[0]
        offset += 8
        return val

    def read_pubkey():
        nonlocal offset
        raw = body[offset : offset + 32]
        offset += 32
        return _pubkey_to_base58(raw)

    def read_bytes32():
        nonlocal offset
        raw = body[offset : offset + 32]
        offset += 32
        return raw.hex()

    payment_id = read_u64()
    sender = read_pubkey()
    recipient = read_pubkey()
    recipient_identifier = read_bytes32()
    amount = read_u64()
    token_mint = read_pubkey()
    expires_at = read_i64()

    return {
        "payment_id": payment_id,
        "sender": sender,
        "recipient": recipient,
        "recipient_identifier": recipient_identifier,
        "amount": amount,
        "token_mint": token_mint,
        "expires_at": expires_at,
    }


def _pubkey_to_base58(raw: bytes) -> str:
    import base58
    return base58.b58encode(raw).decode()


def _ts_to_dt(unix_ts: int) -> datetime:
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc)


def poll_new_events() -> int:
    """
    Fetch signatures for the program since the last known signature,
    parse PaymentCreated events, and persist them.
    Returns the number of new payments stored.
    """
    from payments.models import Payment, SolanaListenerState
    from payments.services.notifier import notify_recipient

    state = SolanaListenerState.get()

    params: list = [
        settings.PROGRAM_ID,
        {"limit": 50, "commitment": "confirmed"},
    ]
    if state.last_signature:
        params[1]["until"] = state.last_signature

    result = _rpc("getSignaturesForAddress", params)
    sigs = result.get("result", [])
    if not sigs:
        return 0

    # Process oldest-first so we can checkpoint after each one
    new_count = 0
    for sig_info in reversed(sigs):
        sig = sig_info["signature"]
        if sig_info.get("err"):
            continue

        tx_result = _rpc(
            "getTransaction",
            [sig, {"encoding": "json", "commitment": "confirmed", "maxSupportedTransactionVersion": 0}],
        )
        tx = tx_result.get("result")
        if not tx:
            continue

        log_messages = tx.get("meta", {}).get("logMessages", [])
        block_time = tx.get("blockTime", 0)

        for log_line in log_messages:
            if not log_line.startswith("Program data: "):
                continue
            b64 = log_line[len("Program data: "):]
            try:
                raw = base64.b64decode(b64)
            except Exception:
                continue

            parsed = _parse_payment_created(raw)
            if not parsed:
                continue

            # Determine recipient_type from recipient field
            default_pubkey = "11111111111111111111111111111111"
            if parsed["recipient"] == default_pubkey:
                recipient_type = "Identifier"
            else:
                recipient_type = "Address"

            _, created = Payment.objects.get_or_create(
                payment_id=parsed["payment_id"],
                defaults={
                    "sender": parsed["sender"],
                    "recipient": parsed["recipient"],
                    "recipient_identifier": parsed["recipient_identifier"],
                    "recipient_type": recipient_type,
                    "amount": parsed["amount"],
                    "token_mint": parsed["token_mint"],
                    "status": "Pending",
                    "on_chain_created_at": _ts_to_dt(block_time),
                    "on_chain_expires_at": _ts_to_dt(parsed["expires_at"]),
                    "tx_signature": sig,
                },
            )
            if created:
                new_count += 1
                if recipient_type == "Identifier":
                    try:
                        notify_recipient(Payment.objects.get(payment_id=parsed["payment_id"]))
                    except Exception:
                        logger.exception("Failed to send notification for payment %s", parsed["payment_id"])

        state.last_signature = sig
        state.save(update_fields=["last_signature"])

    logger.info("Polled Solana: %d new payments found", new_count)
    return new_count
