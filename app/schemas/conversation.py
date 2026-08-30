from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.message import MessageDirection
from app.schemas.common import UtcDatetime
from app.schemas.commerce import OrderOut


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str | None
    customer_chat_id: int
    started_at: UtcDatetime
    last_message_at: UtcDatetime
    handed_off: bool
    message_count: int
    latest_message: str | None = None
    latest_message_direction: MessageDirection | None = None


class ConversationPage(BaseModel):
    items: list[ConversationOut]
    total: int
    page: int
    page_size: int


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    direction: MessageDirection
    text: str
    created_at: UtcDatetime


class ConversationDetail(BaseModel):
    id: int
    customer_name: str | None
    customer_chat_id: int
    handed_off: bool
    messages: list[MessageOut]
    platform: str = "Telegram"
    cart_state: dict[str, Any] | None = None
    linked_order: OrderOut | None = None


class AdminReplyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class HandoffUpdate(BaseModel):
    handed_off: bool
