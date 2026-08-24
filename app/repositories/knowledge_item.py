from app.models.knowledge_item import KnowledgeItem
from app.repositories.base import TenantRepository


class KnowledgeItemRepository(TenantRepository[KnowledgeItem]):
    model = KnowledgeItem

    def exists(self) -> bool:
        return self._scoped_query().with_entities(KnowledgeItem.id).first() is not None

    def list_ordered(self) -> list[KnowledgeItem]:
        return self._scoped_query().order_by(KnowledgeItem.sort_order).all()
