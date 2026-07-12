"""Human handoff: notifying the business owner + admins when a conversation needs a person.

Ported from v1_legacy/bot/handoff.py. Recent context now comes from the
messages table instead of in-memory history, and notifications fan out to
every connected admin too (see app.services.notifications), gated by
Business.notify_on_handoff.
"""
import logging
from typing import Optional

from sqlalchemy.orm import Session
from telegram import Bot

from app.models.business import Business
from app.models.conversation import Conversation
from app.services import conversation_state
from app.services.notifications import notify_recipients

logger = logging.getLogger(__name__)

_CONTEXT_EXCHANGES = 3  # last ~3 exchanges (6 messages), included so the owner has context


async def notify_owner(
    db: Session,
    business_id: int,
    bot: Bot,
    owner_chat_id: Optional[int],
    conversation: Conversation,
    reason: str,
) -> None:
    """Tell the business owner + admins this conversation needs a human, with recent context."""
    name = conversation.customer_name or "(name not given yet)"
    recent = conversation_state.get_recent_messages(
        db, business_id, conversation.id, max_exchanges=_CONTEXT_EXCHANGES
    )
    transcript = "\n".join(
        f"{'Customer' if m.direction.value == 'customer' else 'Bot'}: {m.text}" for m in recent
    ) or "(no recent messages)"

    message = (
        "Human handoff needed!\n"
        f"Customer: {name}\n"
        f"Reason: {reason}\n\n"
        f"Recent conversation:\n{transcript}"
    )

    business = db.get(Business, business_id)
    await notify_recipients(db, business_id, bot, owner_chat_id, message, business.notify_on_handoff)
