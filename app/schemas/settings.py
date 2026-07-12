from typing import Any

from pydantic import BaseModel, Field

from app.models.business import AssistantTone, BusinessType
from app.schemas.common import UtcDatetime


class ProfileOut(BaseModel):
    name: str
    business_type: BusinessType
    address: str | None
    phone: str | None
    default_language: str
    timezone: str
    business_hours: dict[str, Any] | None
    logo_url: str | None


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    business_type: BusinessType
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=50)
    default_language: str = Field(min_length=2, max_length=10)
    timezone: str = Field(min_length=1, max_length=50)
    business_hours: dict[str, Any] | None = None
    logo_url: str | None = Field(default=None, max_length=1000)


class TelegramSettingsOut(BaseModel):
    connected: bool
    bot_username: str | None
    owner_linked: bool
    is_active: bool
    last_started_at: UtcDatetime | None


class AiBehaviorOut(BaseModel):
    assistant_display_name: str | None
    welcome_message_en: str | None
    welcome_message_km: str | None
    tone: AssistantTone
    handoff_on_unsure: bool


class AiBehaviorUpdate(BaseModel):
    assistant_display_name: str | None = Field(default=None, max_length=255)
    welcome_message_en: str | None = None
    welcome_message_km: str | None = None
    tone: AssistantTone
    handoff_on_unsure: bool


class NotificationPrefsOut(BaseModel):
    notify_on_lead: bool
    notify_on_payment: bool
    notify_on_handoff: bool


class NotificationPrefsUpdate(BaseModel):
    notify_on_lead: bool
    notify_on_payment: bool
    notify_on_handoff: bool


class SettingsOut(BaseModel):
    profile: ProfileOut
    telegram: TelegramSettingsOut
    ai_behavior: AiBehaviorOut
    notifications: NotificationPrefsOut


class DeleteKnowledgeResponse(BaseModel):
    deleted_count: int


class DeleteAccountRequest(BaseModel):
    confirm_name: str


class DeleteAccountResponse(BaseModel):
    deleted: bool
