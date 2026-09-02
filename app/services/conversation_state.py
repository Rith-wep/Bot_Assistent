"""Conversation/message persistence and lightweight per-chat state.

Ported from v1_legacy/bot/memory.py. Message history now lives in the
messages table; handed_off and customer_name map onto the existing
conversations columns. The unanswered-answer streak stays in-process
memory exactly as it was in v1 (never persisted there either) — it is
a transient counter, not data any dashboard needs to show.
"""
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.conversation import ConversationRepository
from app.repositories.knowledge_item import KnowledgeItemRepository
from app.repositories.message import MessageRepository

MAX_EXCHANGES = 10  # keep the last 10 user+assistant pairs per chat, same as v1

_unanswered_streaks: dict[tuple[int, int], int] = {}


# ---------------------------------------------------------------------------
# Conversation lifecycle
# ---------------------------------------------------------------------------


def get_active_conversation(db: Session, business_id: int, chat_id: int) -> Conversation:
    """Return the latest tenant-scoped conversation for a chat, or create one."""
    repo = ConversationRepository(db, business_id)
    conversation = repo.get_by_chat_id(chat_id)
    if conversation:
        return conversation
    return repo.create(customer_chat_id=chat_id)


def start_new_conversation(db: Session, business_id: int, chat_id: int) -> Conversation:
    """Used by /reset: starts a fresh conversation so future turns forget prior history,
    without deleting the old conversation's rows (the owner's dashboard can still see it).
    """
    return ConversationRepository(db, business_id).create(customer_chat_id=chat_id)


# ---------------------------------------------------------------------------
# Message history
# ---------------------------------------------------------------------------


def get_recent_messages(
    db: Session, business_id: int, conversation_id: int, max_exchanges: int = MAX_EXCHANGES
) -> list[Message]:
    """Return the recent message window sent to the AI provider."""
    return MessageRepository(db, business_id).list_for_conversation(
        conversation_id, limit=max_exchanges * 2
    )


def add_message(db: Session, business_id: int, conversation_id: int, direction: str, text: str) -> Message:
    """Persist one message and update the conversation's last activity time."""
    message = MessageRepository(db, business_id).create(
        conversation_id=conversation_id, direction=direction, text=text
    )
    conversation = db.get(Conversation, conversation_id)
    conversation.last_message_at = utcnow()
    return message


# ---------------------------------------------------------------------------
# Business knowledge lookup
# ---------------------------------------------------------------------------


def get_knowledge_items(db: Session, business_id: int):
    """Load ordered tenant knowledge used to assemble the AI context."""
    return KnowledgeItemRepository(db, business_id).list_ordered()


# ---------------------------------------------------------------------------
# Conversation flags
# ---------------------------------------------------------------------------


def set_handed_off(conversation: Conversation, active: bool) -> None:
    """Mark whether this conversation is currently owned by a human."""
    conversation.handed_off = active


def set_customer_name(conversation: Conversation, name: str) -> None:
    """Store the customer's display name on the conversation row."""
    conversation.customer_name = name


# ---------------------------------------------------------------------------
# Transient unanswered-question streaks
# ---------------------------------------------------------------------------


def increment_unanswered_streak(business_id: int, chat_id: int) -> int:
    """Increment the in-memory unanswered counter for one tenant/chat pair."""
    key = (business_id, chat_id)
    streak = _unanswered_streaks.get(key, 0) + 1
    _unanswered_streaks[key] = streak
    return streak


def reset_unanswered_streak(business_id: int, chat_id: int) -> None:
    """Clear the in-memory unanswered counter for one tenant/chat pair."""
    _unanswered_streaks.pop((business_id, chat_id), None)


def clear_streak(business_id: int, chat_id: int) -> None:
    """Alias used by command handlers when resetting a chat."""
    reset_unanswered_streak(business_id, chat_id)
