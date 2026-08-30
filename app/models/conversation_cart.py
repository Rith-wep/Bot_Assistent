from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class ConversationCart(Base):
    __tablename__ = "conversation_carts"
    __table_args__ = (
        Index("ix_conversation_carts_business_conversation", "business_id", "conversation_id", unique=True),
        Index("ix_conversation_carts_expires", "expires_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    state: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
