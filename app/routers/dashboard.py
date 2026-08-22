"""Dashboard stats — mock data for now (see schema docstring), except the
handful of fields that already have real backend support, which are
computed for real so the checklist and empty-state never lie to the owner.

TODO(real data): replace the mocked block with real aggregation queries
once conversations/leads have enough volume to make daily charts and
AI-vs-escalated splits meaningful. Payments stay mocked until the KHQR
integration decision is made (see CLAUDE.md "What NOT to do in v2").
"""
import random
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.business import Business
from app.repositories.bot_config import BotConfigRepository
from app.repositories.conversation import ConversationRepository
from app.repositories.knowledge_item import KnowledgeItemRepository
from app.repositories.lead import LeadRepository
from app.repositories.message import MessageRepository
from app.schemas.dashboard import (
    ChartPoint,
    ChecklistStatus,
    DashboardStats,
    PaymentsStat,
    RecentConversation,
    RecentLead,
    StatCard,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}


def _mock_chart(days: int, business_id: int) -> list[ChartPoint]:
    rnd = random.Random(business_id)  # stable across requests, varies per business
    today = date.today()
    return [
        ChartPoint(
            date=(today - timedelta(days=days - 1 - i)).isoformat(),
            count=rnd.randint(0, 14),
        )
        for i in range(days)
    ]


def _last_message_preview(message) -> str:
    if message is None:
        return ""
    text = message.text
    return text if len(text) <= 60 else text[:57] + "..."


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    range: str = Query("30d", pattern="^(7d|30d|90d)$"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardStats:
    business_id = current_user.business_id
    days = RANGE_DAYS[range]

    conversation_repo = ConversationRepository(db, business_id)
    lead_repo = LeadRepository(db, business_id)
    bot_config = BotConfigRepository(db, business_id).get_for_business()

    real_conversations, real_total = conversation_repo.list_paginated(1, 1)
    has_activity = real_total > 0

    knowledge_added = len(KnowledgeItemRepository(db, business_id).list_ordered()) > 0
    telegram_connected = bot_config is not None and bot_config.is_active

    if not has_activity:
        return DashboardStats(
            has_activity=False,
            bot_username=bot_config.bot_username if bot_config else None,
            total_conversations=StatCard(value=0),
            new_leads=StatCard(value=0),
            messages_ai_handled=StatCard(value=0),
            messages_escalated=StatCard(value=0),
            payments=PaymentsStat(count=0, total=0),
            chart=_mock_chart(days, business_id),
            recent_leads=[],
            recent_conversations=[],
            checklist=ChecklistStatus(
                knowledge_added=knowledge_added,
                telegram_connected=telegram_connected,
                admin_notifications_connected=False,
                payments_enabled=False,
            ),
        )

    recent_leads_data, _ = lead_repo.list_paginated(1, 5)
    recent_conversations_data, _ = conversation_repo.list_paginated(1, 5)
    message_repo = MessageRepository(db, business_id)
    latest_messages = message_repo.latest_for_conversations(
        [conv.id for conv in recent_conversations_data]
    )
    business = db.get(Business, business_id)
    language = "km" if business.default_language in ("km", "both") else "en"

    return DashboardStats(
        has_activity=True,
        bot_username=bot_config.bot_username if bot_config else None,
        total_conversations=StatCard(value=128, change_pct=12.5),
        new_leads=StatCard(value=24, change_pct=-4.2),
        messages_ai_handled=StatCard(value=340, change_pct=8.0),
        messages_escalated=StatCard(value=12, change_pct=-15.0),
        payments=PaymentsStat(count=9, total=245.50, change_pct=20.0),
        chart=_mock_chart(days, business_id),
        recent_leads=[
            RecentLead(
                id=lead.id,
                name=lead.customer_name or "Unknown",
                phone=lead.phone or "",
                source="Telegram",
                created_at=lead.created_at,
            )
            for lead in recent_leads_data
        ],
        recent_conversations=[
            RecentConversation(
                id=conv.id,
                customer_name=conv.customer_name or f"Customer #{conv.customer_chat_id}",
                last_message=_last_message_preview(latest_messages.get(conv.id)),
                language=language,
                last_message_at=conv.last_message_at,
            )
            for conv in recent_conversations_data
        ],
        checklist=ChecklistStatus(
            knowledge_added=knowledge_added,
            telegram_connected=telegram_connected,
            admin_notifications_connected=False,
            payments_enabled=False,
        ),
    )
