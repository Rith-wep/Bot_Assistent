from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.business import AssistantTone, BusinessType
from app.models.ai_profile import Personality
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


class AIProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    assistant_name: str
    assistant_role: str
    personality: Personality
    language_mode: str
    response_length: str
    greeting_message_en: str | None
    greeting_message_km: str | None
    fallback_message_en: str | None
    fallback_message_km: str | None


class AIProfileUpdate(BaseModel):
    assistant_name: str = Field(min_length=1, max_length=255)
    assistant_role: str = Field(min_length=1, max_length=500)
    personality: Personality
    language_mode: str = Field(min_length=1, max_length=20)
    response_length: str = Field(min_length=1, max_length=20)
    greeting_message_en: str | None = None
    greeting_message_km: str | None = None
    fallback_message_en: str | None = None
    fallback_message_km: str | None = None


class BusinessRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rule_text: str
    is_active: bool
    sort_order: int


class BusinessRuleCreate(BaseModel):
    rule_text: str = Field(min_length=1, max_length=500)
    is_active: bool = True
    sort_order: int = 0


class BusinessRuleUpdate(BaseModel):
    rule_text: str | None = Field(default=None, min_length=1, max_length=500)
    is_active: bool | None = None
    sort_order: int | None = None


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
    ai_profile: AIProfileOut
    business_rules: list[BusinessRuleOut]


class SettingsCoreOut(BaseModel):
    profile: ProfileOut
    telegram: TelegramSettingsOut
    ai_behavior: AiBehaviorOut
    notifications: NotificationPrefsOut


class SettingsAIProfileOut(BaseModel):
    ai_profile: AIProfileOut
    business_rules: list[BusinessRuleOut]


class DeleteKnowledgeResponse(BaseModel):
    deleted_count: int


class DeleteAccountRequest(BaseModel):
    confirm_name: str


class DeleteAccountResponse(BaseModel):
    deleted: bool
