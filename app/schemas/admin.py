from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class AdminOut(BaseModel):
    id: int
    name: str | None
    chat_id_masked: str
    connected_at: UtcDatetime


class InviteLinkResponse(BaseModel):
    invite_link: str
    expires_at: UtcDatetime
