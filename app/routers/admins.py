import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.core.time import utcnow
from app.db.session import get_db
from app.repositories.admin import AdminInviteRepository, AdminRepository
from app.repositories.bot_config import BotConfigRepository
from app.schemas.admin import AdminOut, InviteLinkResponse

router = APIRouter(prefix="/api/admins", tags=["admins"])

INVITE_EXPIRY_MINUTES = 10


def _mask_chat_id(chat_id: int) -> str:
    digits = str(chat_id)
    return f"•••{digits[-3:]}" if len(digits) > 3 else "•••"


@router.get("", response_model=list[AdminOut])
def list_admins(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[AdminOut]:
    admins = AdminRepository(db, current_user.business_id).list()
    return [
        AdminOut(
            id=admin.id,
            name=admin.name,
            chat_id_masked=_mask_chat_id(admin.chat_id),
            connected_at=admin.connected_at,
        )
        for admin in admins
    ]


@router.post("/invite", response_model=InviteLinkResponse)
def create_invite(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> InviteLinkResponse:
    bot_config = BotConfigRepository(db, current_user.business_id).get_for_business()
    if bot_config is None or not bot_config.bot_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect your Telegram bot before inviting admins.",
        )

    token = secrets.token_urlsafe(24)
    expires_at = utcnow() + timedelta(minutes=INVITE_EXPIRY_MINUTES)
    AdminInviteRepository(db, current_user.business_id).create(
        token=token, expires_at=expires_at
    )
    db.commit()

    return InviteLinkResponse(
        invite_link=f"https://t.me/{bot_config.bot_username}?start=admin_{token}",
        expires_at=expires_at,
    )


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_admin(
    admin_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    repo = AdminRepository(db, current_user.business_id)
    if not repo.delete(admin_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    db.commit()
