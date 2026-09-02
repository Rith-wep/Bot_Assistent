"""FastAPI dependency helpers for authentication and tenant scoping.

Routes use these dependencies to convert a Supabase bearer token into the
local user and business context that every tenant-scoped query relies on.
"""

import uuid
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_supabase_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import get_user_by_supabase_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/signin")
logger = logging.getLogger(__name__)

_INVALID_TOKEN = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


# ---------------------------------------------------------------------------
# Authentication error helpers
# ---------------------------------------------------------------------------


def _invalid_token(exc: Exception | None = None) -> HTTPException:
    """Return a safe 401 response, with extra detail only in development."""
    if settings.app_env == "development" and exc is not None:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token ({exc.__class__.__name__})",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _INVALID_TOKEN


# ---------------------------------------------------------------------------
# Request identity containers
# ---------------------------------------------------------------------------


class CurrentUser:
    """Local authenticated user and tenant context used by application routes."""

    def __init__(self, user_id: int, business_id: int):
        self.user_id = user_id
        self.business_id = business_id


class SupabaseIdentity:
    """Validated identity details decoded from the Supabase access token."""

    def __init__(self, user_id: uuid.UUID, email: str, metadata: dict):
        self.user_id = user_id
        self.email = email
        self.metadata = metadata


# ---------------------------------------------------------------------------
# Public FastAPI dependencies
# ---------------------------------------------------------------------------


def get_supabase_identity(token: str = Depends(oauth2_scheme)) -> SupabaseIdentity:
    """Validate the bearer token and return the Supabase identity payload."""
    try:
        payload = decode_supabase_access_token(token)
        supabase_user_id = uuid.UUID(payload["sub"])
        email = payload["email"].strip().lower()
        metadata = payload.get("user_metadata") or {}
        if not email:
            raise ValueError("missing email")
    except Exception as exc:
        logger.warning("Supabase access token rejected: %s", exc.__class__.__name__)
        raise _invalid_token(exc)

    return SupabaseIdentity(
        user_id=supabase_user_id,
        email=email,
        metadata=metadata if isinstance(metadata, dict) else {},
    )


def get_current_user(
    identity: SupabaseIdentity = Depends(get_supabase_identity),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """Resolve the local user on every request before exposing tenant context."""
    # Re-check the DB every request so deleted users or reassigned businesses
    # cannot keep acting through an otherwise valid Supabase token.
    user = get_user_by_supabase_id(db, identity.user_id)
    if user is None:
        logger.warning("Supabase identity has no local user: %s", identity.user_id)
        raise _invalid_token(ValueError("local user not found"))

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
