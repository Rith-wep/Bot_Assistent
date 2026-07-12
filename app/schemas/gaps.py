from pydantic import BaseModel, Field

from app.models.knowledge_item import KnowledgeCategory
from app.schemas.common import UtcDatetime
from app.schemas.knowledge import KnowledgeItemOut


class ClusterOut(BaseModel):
    id: int
    label_en: str
    label_km: str
    question_count: int
    sample_questions: list[str]
    suggested_category: KnowledgeCategory
    first_seen: UtcDatetime
    last_seen: UtcDatetime


class ResolveClusterRequest(BaseModel):
    category: KnowledgeCategory
    title: str = Field(min_length=1, max_length=255)
    content_km: str | None = None
    content_en: str | None = None
    price: str | None = Field(default=None, max_length=100)


class ResolveClusterResponse(BaseModel):
    knowledge_item: KnowledgeItemOut
    cluster: ClusterOut
