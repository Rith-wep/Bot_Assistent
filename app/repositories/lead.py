from app.models.lead import Lead
from app.repositories.base import TenantRepository


class LeadRepository(TenantRepository[Lead]):
    model = Lead

    def find_for_conversation(self, conversation_id: int, phone: str | None = None) -> Lead | None:
        query = self._scoped_query().filter(Lead.conversation_id == conversation_id)
        if phone:
            query = query.filter(Lead.phone == phone)
        return query.order_by(Lead.created_at.asc()).first()

    def list_paginated(self, page: int, page_size: int) -> tuple[list[Lead], int]:
        query = self._scoped_query().order_by(Lead.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def list_all_ordered(self) -> list[Lead]:
        return self._scoped_query().order_by(Lead.created_at.desc()).all()
