import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_supabase_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import get_user_by_supabase_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/signin")

_INVALID_TOKEN = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


class CurrentUser:
    def __init__(self, user_id: int, business_id: int):
        self.user_id = user_id
        self.business_id = business_id


class SupabaseIdentity:
    def __init__(self, user_id: uuid.UUID, email: str, metadata: dict):
        self.user_id = user_id
        self.email = email
        self.metadata = metadata


def get_supabase_identity(token: str = Depends(oauth2_scheme)) -> SupabaseIdentity:
    try:
        payload = decode_supabase_access_token(token)
        supabase_user_id = uuid.UUID(payload["sub"])
        email = payload["email"].strip().lower()
        metadata = payload.get("user_metadata") or {}
        if not email:
            raise ValueError("missing email")
    except Exception:
        raise _INVALID_TOKEN

    return SupabaseIdentity(
        user_id=supabase_user_id,
        email=email,
        metadata=metadata if isinstance(metadata, dict) else {},
    )


def get_current_user(
    identity: SupabaseIdentity = Depends(get_supabase_identity),
    db: Session = Depends(get_db),
) -> CurrentUser:
    # Re-checked against the DB every request (not just trusted from the token)
    # so a deleted user or business reassignment can't still act as this user.
    user = get_user_by_supabase_id(db, identity.user_id)
    if user is None:
        raise _INVALID_TOKEN

    return CurrentUser(user_id=user.id, business_id=user.business_id)


def get_current_admin_user(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> CurrentUser:
    """Gates the internal admin page (CLAUDE.md's "just for me" page) —
    allow-listed by login email via ADMIN_EMAILS, not a new role/schema
    column, since that page is intentionally minimal for now.
    """
    admin_emails = {e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()}
    user = db.get(User, current_user.user_id)
    if not user or user.email.lower() not in admin_emails:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user
