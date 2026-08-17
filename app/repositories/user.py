import uuid

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base import TenantRepository


class UserRepository(TenantRepository[User]):
    model = User


def get_user_by_email(db: Session, email: str) -> User | None:
    """The one sanctioned cross-tenant lookup: login happens before business_id is known."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_supabase_id(db: Session, supabase_user_id: uuid.UUID) -> User | None:
    return db.query(User).filter(User.supabase_user_id == supabase_user_id).first()
