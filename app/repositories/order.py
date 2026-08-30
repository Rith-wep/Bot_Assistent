from app.models.order import Order
from app.repositories.base import TenantRepository


class OrderRepository(TenantRepository[Order]):
    model = Order

    def find_for_conversation(self, conversation_id: int) -> Order | None:
        return (
            self._scoped_query()
            .filter(Order.conversation_id == conversation_id)
            .order_by(Order.created_at.asc())
            .first()
        )

    def list_paginated(self, page: int, page_size: int) -> tuple[list[Order], int]:
        query = self._scoped_query().order_by(Order.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total
