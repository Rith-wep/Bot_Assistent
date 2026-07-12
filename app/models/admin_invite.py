from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AdminInvite(Base):
    """A one-time, expiring token behind the "Connect Telegram admin" deep
    link (t.me/{bot}?start=admin_{token}). The bot's /start handler consumes
    it to create an Admin row for whoever opens the link
    """

    __tablename__ = "admin_invites"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(nullable=True)
