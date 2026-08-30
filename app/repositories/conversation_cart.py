from app.models.conversation_cart import ConversationCart
from app.repositories.base import TenantRepository


class ConversationCartRepository(TenantRepository[ConversationCart]):
    model = ConversationCart

    def get_for_conversation(self, conversation_id: int) -> ConversationCart | None:
        return (
            self._scoped_query()
            .filter(ConversationCart.conversation_id == conversation_id)
            .first()
        )
