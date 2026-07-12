from sqlalchemy import func

from app.models.message import Message
from app.repositories.base import TenantRepository


class MessageRepository(TenantRepository[Message]):
    model = Message

    def list_for_conversation(self, conversation_id: int) -> list[Message]:
        return (
            self._scoped_query()
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .all()
        )

    def count_for_conversations(self, conversation_ids: list[int]) -> dict[int, int]:
        if not conversation_ids:
            return {}
        rows = (
            self._scoped_query()
            .with_entities(Message.conversation_id, func.count(Message.id))
            .filter(Message.conversation_id.in_(conversation_ids))
            .group_by(Message.conversation_id)
            .all()
        )
        return dict(rows)
