from app.core.time import utcnow
from app.models.admin import Admin
from app.models.admin_invite import AdminInvite
from app.repositories.base import TenantRepository


class AdminRepository(TenantRepository[Admin]):
    model = Admin

    def get_by_chat_id(self, chat_id: int) -> Admin | None:
        return self._scoped_query().filter(Admin.chat_id == chat_id).first()


class AdminInviteRepository(TenantRepository[AdminInvite]):
    model = AdminInvite

    def get_valid_by_token(self, token: str) -> AdminInvite | None:
        invite = self._scoped_query().filter(AdminInvite.token == token).first()
        if invite is None or invite.used_at is not None or invite.expires_at < utcnow():
            return None
        return invite
