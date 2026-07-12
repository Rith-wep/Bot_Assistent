from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.core.security import encrypt_secret
from app.db.session import get_db
from app.models.business import Business
from app.repositories.bot_config import BotConfigRepository, get_by_username_excluding_business
from app.repositories.knowledge_item import KnowledgeItemRepository
from app.schemas.onboarding import (
    Checklist,
    ConnectTelegramResponse,
    GoLiveResponse,
    OnboardingStatus,
    PreviewChatRequest,
    PreviewChatResponse,
    Step1Request,
    TelegramStatus,
    TemplatesResponse,
    ValidateTokenRequest,
    ValidateTokenResponse,
)
from app.services.ai import generate_preview_reply
from app.services.knowledge_templates import get_templates
from app.services.telegram_api import get_bot_info

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


def _status_for(business: Business) -> OnboardingStatus:
    return OnboardingStatus(
        onboarding_step=business.onboarding_step,
        onboarding_completed=business.onboarding_completed,
        business_name=business.name,
        business_type=business.business_type,
        default_language=business.default_language,
    )


def _get_business(db: Session, current_user: CurrentUser) -> Business:
    business = db.get(Business, current_user.business_id)
    if business is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


def _knowledge_ready(db: Session, business_id: int) -> bool:
    items = KnowledgeItemRepository(db, business_id).list_ordered()
    categories = {item.category.value for item in items}
    return "location" in categories and "hours" in categories and (
        "service" in categories or "faq" in categories
    )


@router.get("/status", response_model=OnboardingStatus)
def get_status(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> OnboardingStatus:
    return _status_for(_get_business(db, current_user))


@router.put("/step1", response_model=OnboardingStatus)
def update_step1(
    payload: Step1Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OnboardingStatus:
    business = _get_business(db, current_user)
    business.name = payload.business_name
    business.business_type = payload.business_type
    business.default_language = payload.default_language
    business.onboarding_step = max(business.onboarding_step, 2)
    db.commit()
    db.refresh(business)
    return _status_for(business)


@router.get("/templates", response_model=TemplatesResponse)
def get_knowledge_templates(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> TemplatesResponse:
    business = _get_business(db, current_user)
    template = get_templates(business.business_type.value)
    return TemplatesResponse(**template)


@router.post("/step2/complete", response_model=OnboardingStatus)
def complete_step2(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> OnboardingStatus:
    business = _get_business(db, current_user)
    items = KnowledgeItemRepository(db, business.id).list_ordered()
    categories = {item.category.value for item in items}

    missing = []
    if "location" not in categories:
        missing.append("a location")
    if "hours" not in categories:
        missing.append("opening hours")
    if "service" not in categories and "faq" not in categories:
        missing.append("at least one service or FAQ")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please add {', '.join(missing)} before continuing.",
        )

    business.onboarding_step = max(business.onboarding_step, 3)
    db.commit()
    db.refresh(business)
    return _status_for(business)


@router.post("/telegram/validate-token", response_model=ValidateTokenResponse)
def validate_telegram_token(payload: ValidateTokenRequest) -> ValidateTokenResponse:
    info = get_bot_info(payload.token)
    if info is None:
        return ValidateTokenResponse(
            valid=False,
            error="That token isn't valid. Double-check you copied the whole thing from BotFather.",
        )
    return ValidateTokenResponse(valid=True, bot_username=info["username"], bot_name=info["first_name"])


@router.post("/telegram/connect", response_model=ConnectTelegramResponse)
def connect_telegram(
    payload: ValidateTokenRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConnectTelegramResponse:
    info = get_bot_info(payload.token)
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="That token isn't valid."
        )

    bot_username = info["username"]
    conflict = get_by_username_excluding_business(db, bot_username, current_user.business_id)
    if conflict is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This bot is already connected to a different business.",
        )

    repo = BotConfigRepository(db, current_user.business_id)
    existing = repo.get_for_business()
    encrypted = encrypt_secret(payload.token)
    if existing:
        existing.telegram_bot_token_encrypted = encrypted
        existing.bot_username = bot_username
        existing.is_active = True
    else:
        # owner_chat_id is unknown until the owner messages their new bot (see /start, /myid)
        repo.create(
            telegram_bot_token_encrypted=encrypted,
            bot_username=bot_username,
            owner_chat_id=None,
            is_active=True,
        )
    db.commit()
    return ConnectTelegramResponse(bot_username=bot_username)


@router.get("/telegram/status", response_model=TelegramStatus)
def telegram_status(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> TelegramStatus:
    bot_config = BotConfigRepository(db, current_user.business_id).get_for_business()
    if bot_config is None:
        return TelegramStatus(connected=False, owner_linked=False)
    return TelegramStatus(
        connected=True,
        bot_username=bot_config.bot_username,
        owner_linked=bot_config.owner_chat_id is not None,
    )


@router.post("/step3/complete", response_model=OnboardingStatus)
def complete_step3(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> OnboardingStatus:
    business = _get_business(db, current_user)
    bot_config = BotConfigRepository(db, business.id).get_for_business()
    if bot_config is None or bot_config.owner_chat_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect your Telegram bot and link yourself as the owner before continuing.",
        )
    business.onboarding_step = max(business.onboarding_step, 4)
    db.commit()
    db.refresh(business)
    return _status_for(business)


@router.get("/checklist", response_model=Checklist)
def get_checklist(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> Checklist:
    business = _get_business(db, current_user)
    bot_config = BotConfigRepository(db, business.id).get_for_business()
    return Checklist(
        knowledge_ready=_knowledge_ready(db, business.id),
        bot_connected=bot_config is not None,
        owner_linked=bot_config is not None and bot_config.owner_chat_id is not None,
        bot_username=bot_config.bot_username if bot_config else None,
    )


@router.post("/preview-chat", response_model=PreviewChatResponse)
async def preview_chat(
    payload: PreviewChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PreviewChatResponse:
    history = [{"role": m.role, "text": m.text} for m in payload.history]
    reply = await generate_preview_reply(db, current_user.business_id, history, payload.message)
    return PreviewChatResponse(reply=reply)


@router.post("/go-live", response_model=GoLiveResponse)
def go_live(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> GoLiveResponse:
    business = _get_business(db, current_user)
    bot_config = BotConfigRepository(db, business.id).get_for_business()
    bot_connected = bot_config is not None
    owner_linked = bot_config is not None and bot_config.owner_chat_id is not None
    knowledge_ready = _knowledge_ready(db, business.id)

    if not (knowledge_ready and bot_connected and owner_linked):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finish the checklist before going live.",
        )

    business.onboarding_completed = True
    db.commit()
    return GoLiveResponse(onboarding_completed=True, bot_username=bot_config.bot_username)
