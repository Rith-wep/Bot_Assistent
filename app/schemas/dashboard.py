from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class StatCard(BaseModel):
    value: float
    change_pct: float | None = None


class PaymentsStat(BaseModel):
    count: int
    total: float
    change_pct: float | None = None


class ChartPoint(BaseModel):
    date: str  # YYYY-MM-DD
    count: int


class RecentLead(BaseModel):
    id: int
    name: str
    phone: str
    source: str
    created_at: UtcDatetime


class RecentConversation(BaseModel):
    id: int
    customer_name: str
    last_message: str
    language: str  # "en" | "km"
    last_message_at: UtcDatetime


class ChecklistStatus(BaseModel):
    knowledge_added: bool
    telegram_connected: bool
    admin_notifications_connected: bool
    payments_enabled: bool


class DashboardStats(BaseModel):
    has_activity: bool
    bot_username: str | None
    total_conversations: StatCard
    new_leads: StatCard
    messages_ai_handled: StatCard
    messages_escalated: StatCard
    payments: PaymentsStat
    chart: list[ChartPoint]
    recent_leads: list[RecentLead]
    recent_conversations: list[RecentConversation]
    checklist: ChecklistStatus


class DashboardSummary(BaseModel):
    has_activity: bool
    bot_username: str | None
    total_conversations: StatCard
    new_leads: StatCard
    messages_ai_handled: StatCard
    messages_escalated: StatCard
    payments: PaymentsStat
    checklist: ChecklistStatus


class DashboardActivity(BaseModel):
    chart: list[ChartPoint]
    recent_leads: list[RecentLead]
    recent_conversations: list[RecentConversation]
