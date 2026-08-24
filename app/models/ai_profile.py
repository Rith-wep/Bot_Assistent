import enum

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Personality(str, enum.Enum):
    professional = "professional"
    friendly = "friendly"
    casual = "casual"
    luxury = "luxury"
    sales = "sales"


class AIProfile(Base):
    __tablename__ = "ai_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), unique=True, index=True)
    assistant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    assistant_role: Mapped[str] = mapped_column(String(500), nullable=False)
    personality: Mapped[Personality] = mapped_column(Enum(Personality, name="ai_personality"), nullable=False)
    language_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="mirror")
    response_length: Mapped[str] = mapped_column(String(20), nullable=False, default="short")
    greeting_message_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    greeting_message_km: Mapped[str | None] = mapped_column(Text, nullable=True)
    fallback_message_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    fallback_message_km: Mapped[str | None] = mapped_column(Text, nullable=True)
