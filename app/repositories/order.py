from app.models.order import CustomerChannel, Order, OrderItem, OrderStatus, PaymentStatus
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

    def list_paginated(
        self,
        page: int,
        page_size: int,
        *,
        status: OrderStatus | None = None,
        channel: CustomerChannel | None = None,
        payment_status: PaymentStatus | None = None,
        search: str | None = None,
    ) -> tuple[list[Order], int]:
        query = self._scoped_query().order_by(Order.created_at.desc())
        if status is not None:
            query = query.filter(Order.status == status)
        if channel is not None:
            query = query.filter(Order.channel == channel)
        if payment_status is not None:
            query = query.filter(Order.payment_status == payment_status)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                Order.order_number.ilike(pattern)
                | Order.customer_name.ilike(pattern)
                | Order.phone.ilike(pattern)
                | Order.external_customer_id.ilike(pattern)
            )
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def list_items(self, order_id: int) -> list[OrderItem]:
        return (
            self.db.query(OrderItem)
            .filter(OrderItem.business_id == self.business_id, OrderItem.order_id == order_id)
            .order_by(OrderItem.id)
            .all()
        )
