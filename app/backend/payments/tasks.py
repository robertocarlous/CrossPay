from celery import shared_task


@shared_task(name="payments.tasks.poll_solana_events")
def poll_solana_events():
    from payments.services.listener import poll_new_events
    return poll_new_events()


@shared_task(name="payments.tasks.poll_bridge_statuses")
def poll_bridge_statuses():
    """
    Check LiFi for status updates on all pending bridge transactions.
    Fires every 30 seconds via Celery beat.
    Stops polling a transaction after MAX_POLL_ATTEMPTS.
    """
    from payments.models import BridgeTransaction
    from payments.services.lifi import MAX_POLL_ATTEMPTS, poll_and_update
    from payments.services.notifier import notify_bridge_complete

    pending = BridgeTransaction.objects.filter(
        status="PENDING",
        poll_count__lt=MAX_POLL_ATTEMPTS,
    )

    completed = 0
    for bridge_tx in pending:
        new_status = poll_and_update(bridge_tx)
        if new_status == "DONE":
            completed += 1
            try:
                notify_bridge_complete(bridge_tx)
            except Exception:
                pass

    return {"checked": pending.count(), "completed": completed}
