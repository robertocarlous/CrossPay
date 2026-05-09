"""
LiFi API client.

LiFi is the cross-chain routing protocol. After a user initiates a bridge
from an EVM chain to Solana, we poll this API to track when funds arrive.

LiFi status endpoint:
  GET https://li.quest/v1/status
    ?txHash=<evm_tx_hash>
    &fromChain=<chain_id>
    &toChain=<chain_id>
    &bridge=<bridge_name>   (optional, improves lookup speed)

Possible status values: NOT_FOUND | PENDING | DONE | FAILED | INVALID
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

LIFI_API_BASE = "https://li.quest/v1"
# LiFi's internal chain ID for Solana
SOLANA_CHAIN_ID = 1151111081099710
# Stop polling after this many attempts (~25 minutes at 30s intervals)
MAX_POLL_ATTEMPTS = 50


def get_bridge_status(tx_hash: str, from_chain_id: int, to_chain_id: int, bridge: str = "") -> dict:
    """
    Poll LiFi for the status of a bridge transaction.
    Returns the full LiFi status response dict.
    Raises requests.HTTPError on non-2xx responses.
    """
    params = {
        "txHash": tx_hash,
        "fromChain": from_chain_id,
        "toChain": to_chain_id,
    }
    if bridge:
        params["bridge"] = bridge

    resp = requests.get(
        f"{LIFI_API_BASE}/status",
        params=params,
        timeout=15,
        headers={"accept": "application/json"},
    )
    resp.raise_for_status()
    return resp.json()


def get_routes(
    from_chain_id: int,
    to_chain_id: int,
    from_token: str,
    to_token: str,
    from_amount: str,
    from_address: str,
    to_address: str,
) -> dict:
    """
    Fetch available bridge routes from LiFi.
    Primarily called by the frontend SDK, but this backend wrapper
    lets the frontend request routes via the Django API if needed
    (avoids exposing CORS issues with direct LiFi calls).
    """
    payload = {
        "fromChainId": from_chain_id,
        "toChainId": to_chain_id,
        "fromTokenAddress": from_token,
        "toTokenAddress": to_token,
        "fromAmount": from_amount,       # in wei / smallest unit
        "fromAddress": from_address,
        "toAddress": to_address,
        "options": {
            "slippage": 0.03,            # 3% slippage tolerance
            "order": "RECOMMENDED",
        },
    }
    resp = requests.post(
        f"{LIFI_API_BASE}/advanced/routes",
        json=payload,
        timeout=20,
        headers={"accept": "application/json", "content-type": "application/json"},
    )
    resp.raise_for_status()
    return resp.json()


def poll_and_update(bridge_tx) -> str:
    """
    Fetch the latest LiFi status for a BridgeTransaction and update it in the DB.
    Returns the new status string.
    """
    from payments.models import BridgeTransaction

    try:
        data = get_bridge_status(
            tx_hash=bridge_tx.bridge_tx_hash,
            from_chain_id=bridge_tx.from_chain_id,
            to_chain_id=bridge_tx.to_chain_id,
            bridge=bridge_tx.bridge_name,
        )
    except requests.HTTPError as e:
        logger.warning("LiFi status fetch failed for %s: %s", bridge_tx.bridge_tx_hash[:12], e)
        bridge_tx.poll_count += 1
        bridge_tx.save(update_fields=["poll_count", "updated_at"])
        return bridge_tx.status

    lifi_status = data.get("status", "PENDING").upper()

    # Map LiFi's NOT_FOUND to PENDING (transaction just submitted)
    if lifi_status == "NOT_FOUND":
        lifi_status = "PENDING"

    # Extract Solana receiving tx signature if bridge is complete
    solana_sig = ""
    if lifi_status == "DONE":
        receiving = data.get("receiving", {})
        solana_sig = receiving.get("txHash", "")

    bridge_tx.status = lifi_status
    bridge_tx.poll_count += 1
    if solana_sig:
        bridge_tx.solana_tx_signature = solana_sig
    bridge_tx.save(update_fields=["status", "poll_count", "solana_tx_signature", "updated_at"])

    logger.info(
        "Bridge %s… status=%s (poll #%d)",
        bridge_tx.bridge_tx_hash[:12],
        lifi_status,
        bridge_tx.poll_count,
    )
    return lifi_status
