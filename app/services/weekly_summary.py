"""Weekly Intelligence — Monday summary to the business owner's Telegram.

Computes last week's activity for one business, composes a short bilingual
message, and sends it to the owner. Guarded by businesses.last_summary_sent
so re-running (or a retry after a crash) never double-sends for the same
ISO week. The CLI loop over every business lives in
app/jobs/weekly_summary.py — this module only knows how to do one business.
"""
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session
from telegram import Bot

from app.core.config import settings
from app.core.security import decrypt_secret
from app.core.time import utcnow
from app.models.business import Business
from app.models.conversation import Conversation
from app.models.lead import Lead
from app.models.message import Message, MessageDirection
from app.repositories.bot_config import BotConfigRepository
from app.repositories.question_cluster import QuestionClusterRepository

logger = logging.getLogger(__name__)

_WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _week_window(business_timezone: str, now_utc: datetime) -> tuple[datetime, datetime]:
    """The most recently completed Mon 00:00 -> Mon 00:00 window in the
    business's own timezone, as naive-UTC datetimes (the DB's convention).
    Based on "now", not the literal calendar day, so this is safe to compute
    whenever the job actually runs (including a manual test run mid-week).
    """
    tz = ZoneInfo(business_timezone)
    now_local = now_utc.replace(tzinfo=dt_timezone.utc).astimezone(tz)
    this_monday_local = (now_local - timedelta(days=now_local.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    last_monday_local = this_monday_local - timedelta(days=7)
    week_start = last_monday_local.astimezone(dt_timezone.utc).replace(tzinfo=None)
    week_end = this_monday_local.astimezone(dt_timezone.utc).replace(tzinfo=None)
    return week_start, week_end


def _is_after_hours(dt_utc: datetime, tz: ZoneInfo, business_hours: dict | None) -> bool:
    if not business_hours:
        return False  # no hours configured — nothing to compare against
    local = dt_utc.replace(tzinfo=dt_timezone.utc).astimezone(tz)
    day = business_hours.get(_WEEKDAY_KEYS[local.weekday()])
    if not day or day.get("closed"):
        return True
    open_str, close_str = day.get("open"), day.get("close")
    if not open_str or not close_str:
        return False
    return not (open_str <= local.strftime("%H:%M") <= close_str)


def compute_week_stats(
    db: Session, business: Business, week_start: datetime, week_end: datetime
) -> dict:
    business_id = business.id
    tz = ZoneInfo(business.timezone)

    conversations = (
        db.query(func.count(Conversation.id))
        .filter(
            Conversation.business_id == business_id,
            Conversation.started_at >= week_start,
            Conversation.started_at < week_end,
        )
        .scalar()
    )
    messages_sent = (
        db.query(func.count(Message.id))
        .filter(
            Message.business_id == business_id,
            Message.direction == MessageDirection.bot,
            Message.created_at >= week_start,
            Message.created_at < week_end,
        )
        .scalar()
    )
    customer_message_times = (
        db.query(Message.created_at)
        .filter(
            Message.business_id == business_id,
            Message.direction == MessageDirection.customer,
            Message.created_at >= week_start,
            Message.created_at < week_end,
        )
        .all()
    )
    after_hours = sum(
        1 for (created_at,) in customer_message_times if _is_after_hours(created_at, tz, business.business_hours)
    )
    new_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.business_id == business_id,
            Lead.created_at >= week_start,
            Lead.created_at < week_end,
        )
        .scalar()
    )
    # Approximation: conversations flagged handed_off that were active this
    # week. There's no separate handoff-event log to count exact occurrences.
    handoffs = (
        db.query(func.count(Conversation.id))
        .filter(
            Conversation.business_id == business_id,
            Conversation.handed_off.is_(True),
            Conversation.last_message_at >= week_start,
            Conversation.last_message_at < week_end,
        )
        .scalar()
    )

    return {
        "conversations": conversations or 0,
        "messages_sent": messages_sent or 0,
        "after_hours": after_hours,
        "new_leads": new_leads or 0,
        "handoffs": handoffs or 0,
    }


def _compose_message(business: Business, stats: dict, cluster_count: int, top_labels: list[str]) -> str:
    lang = "en" if business.default_language == "en" else "km"
    dashboard_url = f"{settings.frontend_url}/dashboard"
    name = business.name
    has_activity = stats["conversations"] > 0 or stats["new_leads"] > 0

    if lang == "en":
        if not has_activity:
            return (
                f"👋 Quiet week for {name} — no conversations came in.\n\n"
                f"Your assistant is ready whenever customers reach out.\n\n"
                f"Dashboard: {dashboard_url}"
            )
        lines = [
            f"📊 Weekly summary for {name}",
            "",
            f"• {stats['conversations']} conversation(s), {stats['messages_sent']} reply/replies sent",
            f"• {stats['after_hours']} message(s) came in after business hours",
            f"• {stats['new_leads']} new lead(s)",
            f"• {stats['handoffs']} handed off to a human",
        ]
        if cluster_count:
            top = ", ".join(top_labels)
            lines += ["", f"❓ {cluster_count} question topic(s) still need answers — top: {top}."]
        lines += ["", f"View more: {dashboard_url}"]
        return "\n".join(lines)

    if not has_activity:
        return (
            f"👋 សប្តាហ៍នេះស្ងាត់សម្រាប់ {name} — មិនទាន់មានការសន្ទនាថ្មីទេ។\n\n"
            f"ជំនួយការរបស់អ្នកនៅតែរង់ចាំជួយអតិថិជននៅពេលណាដែលពួកគេទាក់ទងមក។\n\n"
            f"ផ្ទាំងគ្រប់គ្រង៖ {dashboard_url}"
        )
    lines = [
        f"📊 សេចក្តីសង្ខេបប្រចាំសប្តាហ៍សម្រាប់ {name}",
        "",
        f"• សន្ទនា {stats['conversations']} ដង, ឆ្លើយតប {stats['messages_sent']} សារ",
        f"• {stats['after_hours']} សារបានទទួលក្រៅម៉ោងធ្វើការ",
        f"• អតិថិជនថ្មី {stats['new_leads']} នាក់",
        f"• បញ្ជូនទៅបុគ្គលិក {stats['handoffs']} ដង",
    ]
    if cluster_count:
        top = ", ".join(top_labels)
        lines += ["", f"❓ មានប្រធានបទសំណួរ {cluster_count} ដែលនៅតែត្រូវការចម្លើយ — លេចធ្លោៈ {top}។"]
    lines += ["", f"មើលបន្ថែម៖ {dashboard_url}"]
    return "\n".join(lines)


async def send_weekly_summary(db: Session, business: Business, force: bool = False) -> bool:
    """Returns True if a message was sent, False if skipped (already sent
    this week, or no connected+linked bot to send through).
    """
    week_start, week_end = _week_window(business.timezone, utcnow())

    if not force and business.last_summary_sent == week_end:
        return False

    bot_config = BotConfigRepository(db, business.id).get_for_business()
    if not bot_config or not bot_config.is_active or not bot_config.owner_chat_id:
        return False

    stats = compute_week_stats(db, business, week_start, week_end)
    clusters = QuestionClusterRepository(db, business.id).list_open_by_count()
    label_field = "label_en" if business.default_language == "en" else "label_km"
    top_labels = [getattr(c, label_field) for c in clusters[:2]]

    message = _compose_message(business, stats, len(clusters), top_labels)

    token = decrypt_secret(bot_config.telegram_bot_token_encrypted)
    bot = Bot(token=token)
    await bot.send_message(chat_id=bot_config.owner_chat_id, text=message)

    business.last_summary_sent = week_end
    db.commit()
    return True
