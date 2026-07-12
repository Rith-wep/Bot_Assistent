from pydantic import BaseModel

from app.models.business import BusinessStatus, Plan
from app.schemas.common import UtcDatetime


class AdminBusinessOut(BaseModel):
    id: int
    name: str
    status: BusinessStatus
    plan: Plan
    open_cluster_count: int
    last_summary_sent: UtcDatetime | None
    created_at: UtcDatetime
