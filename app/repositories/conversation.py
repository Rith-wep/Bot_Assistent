from app.models.conversation import Conversation
from app.repositories.base import TenantRepository


class ConversationRepository(TenantRepository[Conversation]):
    model = Conversation

    def get_by_chat_id(self, customer_chat_id: int) -> Conversation | None:
        return (
            self._scoped_query()
            .filter(Conversation.customer_chat_id == customer_chat_id)
            .order_by(Conversation.started_at.desc())
            .first()
        )

    def list_paginated(self, page: int, page_size: int) -> tuple[list[Conversation], int]:
        query = self._scoped_query().order_by(Conversation.last_message_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total
