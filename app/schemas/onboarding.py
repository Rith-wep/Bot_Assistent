from pydantic import BaseModel, Field

from app.models.business import BusinessType


class OnboardingStatus(BaseModel):
    onboarding_step: int
    onboarding_completed: bool
    business_name: str
    business_type: BusinessType
    default_language: str


class Step1Request(BaseModel):
    business_name: str = Field(min_length=1, max_length=255)
    business_type: BusinessType
    default_language: str = Field(min_length=2, max_length=10)


class TemplatesResponse(BaseModel):
    label: str
    tone: str
    default_personality: str
    assistant_role: str
    default_rules: list[str]
    extractor_hint: str
    starter_items: list[dict]
    faqs: list[dict]


class ValidateTokenRequest(BaseModel):
    token: str = Field(min_length=1)


class ValidateTokenResponse(BaseModel):
    valid: bool
    bot_username: str | None = None
    bot_name: str | None = None
    error: str | None = None


class ConnectTelegramResponse(BaseModel):
    bot_username: str


class TelegramStatus(BaseModel):
    connected: bool
    bot_username: str | None = None
    owner_linked: bool


class Checklist(BaseModel):
    knowledge_ready: bool
    bot_connected: bool
    owner_linked: bool
    bot_username: str | None = None


class PreviewMessage(BaseModel):
    role: str  # "customer" or "bot"
    text: str


class PreviewChatRequest(BaseModel):
    message: str
    history: list[PreviewMessage] = []


class PreviewChatResponse(BaseModel):
    reply: str


class GoLiveResponse(BaseModel):
    onboarding_completed: bool
    bot_username: str | None = None
