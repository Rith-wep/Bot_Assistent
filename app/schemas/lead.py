from pydantic import BaseModel, ConfigDict

from app.schemas.common import UtcDatetime


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str | None
    phone: str | None
    interest: str | None
    created_at: UtcDatetime
    conversation_id: int


class LeadPage(BaseModel):
    items: list[LeadOut]
    total: int
    page: int
    page_size: int
