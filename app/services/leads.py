"""Lead capture: saving a completed lead and notifying the business owner + admins.

Ported from v1_legacy/bot/leads.py — same notification message text, now
persisted to the leads table and fanned out to every connected admin too
(see app.services.notifications), gated by Business.notify_on_lead.
"""
import logging
from typing import Optional

from sqlalchemy.orm import Session
from telegram import Bot

from app.models.business import Business
from app.models.conversation import Conversation
from app.repositories.lead import LeadRepository
from app.services import conversation_state
from app.services.notifications import notify_recipients

logger = logging.getLogger(__name__)


async def process_lead(
    db: Session,
    business_id: int,
    bot: Bot,
    owner_chat_id: Optional[int],
    conversation: Conversation,
    name: str,
    phone: str,
    interest: str,
) -> None:
    """Save a captured lead to the DB and notify the business owner + admins on Telegram."""
    conversation_state.set_customer_name(conversation, name)

    lead_repo = LeadRepository(db, business_id)
    existing_lead = lead_repo.find_for_conversation(conversation.id, phone)
    if existing_lead:
        logger.info(
            "Skipping duplicate lead capture for conversation=%s lead=%s",
            conversation.id,
            existing_lead.id,
        )
        return

    lead = lead_repo.create(
        conversation_id=conversation.id,
        customer_name=name,
        phone=phone,
        interest=interest,
    )

    business = db.get(Business, business_id)
    message = (
        "New lead!\n"
        f"Name: {name}\n"
        f"Phone: {phone}\n"
        f"Wants: {interest}\n"
        f"Time: {lead.created_at.isoformat(timespec='seconds')}"
    )
    lead.notified_owner = await notify_recipients(
        db, business_id, bot, owner_chat_id, message, business.notify_on_lead
    )
