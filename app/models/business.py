import enum
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class BusinessType(str, enum.Enum):
    service_appointment = "service_appointment"
    product_retail = "product_retail"
    food_beverage = "food_beverage"
    property_real_estate = "property_real_estate"
    education = "education"
    professional_other = "professional_other"


class Plan(str, enum.Enum):
    trial = "trial"
    basic = "basic"
    standard = "standard"
    premium = "premium"


class BusinessStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    cancelled = "cancelled"


class AssistantTone(str, enum.Enum):
    friendly = "friendly"
    professional = "professional"
    short = "short"


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_type: Mapped[BusinessType] = mapped_column(
        Enum(BusinessType, name="business_type"), default=BusinessType.professional_other
    )
    default_language: Mapped[str] = mapped_column(String(10), default="km")
    plan: Mapped[Plan] = mapped_column(Enum(Plan, name="plan"), default=Plan.trial)
    status: Mapped[BusinessStatus] = mapped_column(
        Enum(BusinessStatus, name="business_status"), default=BusinessStatus.active
    )
    onboarding_step: Mapped[int] = mapped_column(default=1)
    onboarding_completed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    # The single fictional business behind the public landing page's live
    # demo (app/routers/demo.py) — excluded from the internal admin console
    # and never a real tenant (no bot_config, no users, no real customers).
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Business profile
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Phnom_Penh")
    business_hours: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # AI assistant behavior
    assistant_display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    welcome_message_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    welcome_message_km: Mapped[str | None] = mapped_column(Text, nullable=True)
    tone: Mapped[AssistantTone] = mapped_column(
        Enum(AssistantTone, name="assistant_tone"), default=AssistantTone.friendly
    )
    handoff_on_unsure: Mapped[bool] = mapped_column(Boolean, default=True)

    # Notification preferences
    notify_on_lead: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_payment: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_handoff: Mapped[bool] = mapped_column(Boolean, default=True)

    # Weekly Intelligence: the Monday 00:00 (business timezone, stored as naive
    # UTC) of the ISO week a summary was already sent for — guards against
    # double-sending if the job is re-run within the same week.
    last_summary_sent: Mapped[datetime | None] = mapped_column(nullable=True)
