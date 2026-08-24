from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, SupabaseIdentity, get_current_user, get_supabase_identity
from app.db.session import get_db
from app.models.business import BusinessType
from app.models.user import User
from app.repositories.business import BusinessRepository
from app.repositories.user import UserRepository, get_user_by_email, get_user_by_supabase_id
from app.schemas.auth import AuthProfileResponse, BootstrapRequest
from app.services.ai_profile import ensure_ai_profile

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _profile(db: Session, user) -> AuthProfileResponse:
    business = BusinessRepository(db).get(user.business_id)
    if business is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid account")
    return AuthProfileResponse(
        user_id=user.id,
        email=user.email,
        role=user.role.value,
        business_id=business.id,
        business_name=business.name,
        logo_url=business.logo_url,
    )


@router.post("/bootstrap", response_model=AuthProfileResponse)
def bootstrap(
    payload: BootstrapRequest | None = None,
    identity: SupabaseIdentity = Depends(get_supabase_identity),
    db: Session = Depends(get_db),
) -> AuthProfileResponse:
    """Create the local tenant profile once for a verified Supabase user.

    The unique Supabase UUID is the idempotency boundary. Business metadata is
    accepted only during first-time provisioning and is never used later for
    authorization.
    """
    existing = get_user_by_supabase_id(db, identity.user_id)
    if existing:
        return _profile(db, existing)

    # Never auto-link a legacy account by email. Existing identities must be
    # mapped through a controlled migration using the immutable Supabase UUID.
    legacy_user = get_user_by_email(db, identity.email)
    if legacy_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This existing account must be linked by an administrator",
        )

    metadata = identity.metadata
    business_name = (payload.business_name if payload else None) or metadata.get("business_name")
    raw_business_type = (payload.business_type if payload else None) or metadata.get("business_type")
    if not isinstance(business_name, str) or not business_name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Business information is required to finish account setup",
        )
    try:
        try:
            business_type = BusinessType(raw_business_type or BusinessType.professional_other.value)
        except ValueError:
            business_type = BusinessType.professional_other
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid business type",
        )

    try:
        business = BusinessRepository(db).create(
            name=business_name.strip(),
            business_type=business_type,
            default_language="km",
            plan="trial",
            status="active",
        )
        db.flush()
        user = UserRepository(db, business.id).create(
            supabase_user_id=identity.user_id,
            email=identity.email,
            password_hash=None,
            role="owner",
        )
        ensure_ai_profile(db, business)
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = get_user_by_supabase_id(db, identity.user_id)
        if existing:
            return _profile(db, existing)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account conflict")

    return _profile(db, user)


@router.get("/me", response_model=AuthProfileResponse)
def me(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthProfileResponse:
    user = db.get(User, current_user.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid account")
    return _profile(db, user)
