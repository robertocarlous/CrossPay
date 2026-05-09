import logging

from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def notify_recipient(payment) -> None:
    """
    Look up who owns the payment's identifier_hash and send them an email.
    Only fires for Identifier-type payments where the recipient is unknown at send time.
    """
    from accounts.models import User

    try:
        user = User.objects.get(identifier_hash=payment.recipient_identifier)
    except User.DoesNotExist:
        # Recipient hasn't registered yet — they'll see it when they sign up
        logger.info(
            "No user found for identifier_hash=%s; skipping notification",
            payment.recipient_identifier,
        )
        return

    contact = user.email or user.phone
    if not contact:
        return

    amount_display = f"{payment.amount_usdc:.2f} USDC"
    note_section = f'\n\nNote: "{payment.note}"' if payment.note else ""

    if user.email:
        send_mail(
            subject=f"You received {amount_display} on CrossPay",
            message=(
                f"Hi @{user.username},\n\n"
                f"Someone sent you {amount_display} via CrossPay.\n"
                f"Payment ID: {payment.payment_id}"
                f"{note_section}\n\n"
                f"Open the CrossPay app to claim it before it expires."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Notification sent to %s for payment %s", user.email, payment.payment_id)

    payment.notification_sent = True
    payment.save(update_fields=["notification_sent"])


def notify_bridge_complete(bridge_tx) -> None:
    """
    Tell the sender their cross-chain bridge is done and USDC has arrived
    on their Solana wallet — they can now send the payment via CrossPay.
    """
    from accounts.models import User

    try:
        user = User.objects.get(wallet_address=bridge_tx.sender_solana_address)
    except User.DoesNotExist:
        logger.info("No user for Solana address %s; skipping bridge notification", bridge_tx.sender_solana_address)
        return

    if not user.email:
        return

    send_mail(
        subject="Your funds have arrived on Solana — CrossPay",
        message=(
            f"Hi @{user.username},\n\n"
            f"Your cross-chain transfer is complete. Your USDC has arrived on Solana.\n\n"
            f"You can now open CrossPay and send the payment to your recipient.\n\n"
            f"Bridge transaction: {bridge_tx.bridge_tx_hash}"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("Bridge complete notification sent to %s", user.email)
