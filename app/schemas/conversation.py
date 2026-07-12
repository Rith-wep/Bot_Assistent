from pydantic import BaseModel, ConfigDict

from app.models.message import MessageDirection
from app.schemas.common import UtcDatetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str | None
    customer_chat_id: int
    started_at: UtcDatetime
    last_message_at: UtcDatetime
    handed_off: bool
    message_count: int


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
