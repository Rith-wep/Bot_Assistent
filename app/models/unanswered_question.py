import enum
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class UnansweredQuestionStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"
    dismissed = "dismissed"


class UnansweredQuestion(Base):
    """A moment the assistant could not answer from the business's knowledge.

    Captured at the same instant as the existing unanswered-streak/handoff
    detection in app/services/ai.py. cluster_id is set by the nightly
    clustering job once this question has been grouped into a topic.
    """

    __tablename__ = "unanswered_questions"
    __table_args__ = (
        Index("ix_unanswered_questions_business_created", "business_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id"), nullable=False, index=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    status: Mapped[UnansweredQuestionStatus] = mapped_column(
        Enum(UnansweredQuestionStatus, name="unanswered_question_status"),
        nullable=False,
        default=UnansweredQuestionStatus.open,
    )
    cluster_id: Mapped[int | None] = mapped_column(
        ForeignKey("question_clusters.id"), nullable=True, index=True
    )
