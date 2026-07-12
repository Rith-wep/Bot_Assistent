"""Shared fan-out for owner + admin notifications, gated by the business's
notification preference toggles (see Business.notify_on_*).
"""
import logging

from sqlalchemy.orm import Session
from telegram import Bot

from app.repositories.admin import AdminRepository

logger = logging.getLogger(__name__)


async def notify_recipients(
    db: Session,
    business_id: int,
    bot: Bot,
    owner_chat_id: int | None,
    message: str,
    enabled: bool,
) -> bool:
    """Send `message` to the owner and all connected admins. Returns True if
    at least one send succeeded. `enabled` is the per-business toggle for
    this notification category (new lead / handoff / payment).
    """
    if not enabled:
        return False

    recipients = set()
    if owner_chat_id is not None:
        recipients.add(owner_chat_id)
    recipients.update(a.chat_id for a in AdminRepository(db, business_id).list())

    sent_any = False
    for chat_id in recipients:
        try:
            await bot.send_message(chat_id=chat_id, text=message)
            sent_any = True
        except Exception:
            logger.exception("business_id=%s: failed to notify chat_id=%s", business_id, chat_id)
    return sent_any
