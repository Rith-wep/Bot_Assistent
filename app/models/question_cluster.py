from datetime import datetime
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base
from app.models.unanswered_question import UnansweredQuestionStatus


class QuestionCluster(Base):
    """A topic the nightly clustering job grouped from a business's
    unanswered_questions (e.g. 9 phrasings of "how much for braces" ->
    one cluster). Shares its status lifecycle (open/resolved/dismissed)
    with UnansweredQuestionStatus — the Postgres enum type is reused
    across both tables rather than duplicated.
    """

    __tablename__ = "question_clusters"
    __table_args__ = (
        Index("ix_question_clusters_business_status", "business_id", "status"),
        Index(
            "ix_question_clusters_business_status_count",
            "business_id",
            "status",
            "question_count",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    label_en: Mapped[str] = mapped_column(String(255), nullable=False)
    label_km: Mapped[str] = mapped_column(String(255), nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    sample_questions: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    first_seen: Mapped[datetime] = mapped_column(default=utcnow)
    last_seen: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    status: Mapped[UnansweredQuestionStatus] = mapped_column(
        Enum(UnansweredQuestionStatus, name="unanswered_question_status"),
        nullable=False,
        default=UnansweredQuestionStatus.open,
    )
