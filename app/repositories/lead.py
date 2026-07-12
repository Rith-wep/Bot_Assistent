from app.models.lead import Lead
from app.repositories.base import TenantRepository


class LeadRepository(TenantRepository[Lead]):
    model = Lead

    def list_paginated(self, page: int, page_size: int) -> tuple[list[Lead], int]:
        query = self._scoped_query().order_by(Lead.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def list_all_ordered(self) -> list[Lead]:
        return self._scoped_query().order_by(Lead.created_at.desc()).all()
