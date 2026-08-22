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

    def latest_for_conversations(self, conversation_ids: list[int]) -> dict[int, Message]:
        if not conversation_ids:
            return {}

        ranked_messages = (
            self._scoped_query()
            .with_entities(
                Message.id.label("message_id"),
                Message.conversation_id.label("conversation_id"),
                func.row_number()
                .over(
                    partition_by=Message.conversation_id,
                    order_by=(Message.created_at.desc(), Message.id.desc()),
                )
                .label("rank"),
            )
            .filter(Message.conversation_id.in_(conversation_ids))
            .subquery()
        )

        rows = (
            self.db.query(Message)
            .join(ranked_messages, Message.id == ranked_messages.c.message_id)
            .filter(ranked_messages.c.rank == 1)
            .all()
        )
        return {message.conversation_id: message for message in rows}
