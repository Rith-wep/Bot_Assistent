from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class Admin(Base):
    """An additional Telegram account (besides the primary owner_chat_id) that
    receives owner-style notifications, claimed via a one-time deep-link
    invite (see AdminInvite).
    """

    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    connected_at: Mapped[datetime] = mapped_column(default=utcnow)
