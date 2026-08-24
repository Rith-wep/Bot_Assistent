from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.admin import Admin
from app.models.admin_invite import AdminInvite
from app.models.ai_profile import AIProfile
from app.models.business_rule import BusinessRule
from app.models.bot_config import BotConfig
from app.models.business import Business
from app.models.conversation import Conversation
from app.models.knowledge_item import KnowledgeItem
from app.models.lead import Lead
from app.models.message import Message
from app.models.user import User
from app.repositories.bot_config import BotConfigRepository
from app.repositories.knowledge_item import KnowledgeItemRepository
from app.schemas.settings import (
    AIProfileOut,
    AIProfileUpdate,
    BusinessRuleCreate,
    BusinessRuleOut,
    BusinessRuleUpdate,
    AiBehaviorOut,
    AiBehaviorUpdate,
    DeleteAccountRequest,
    DeleteAccountResponse,
    DeleteKnowledgeResponse,
    NotificationPrefsOut,
    NotificationPrefsUpdate,
    ProfileOut,
    ProfileUpdate,
    SettingsOut,
    SettingsAIProfileOut,
    SettingsCoreOut,
    TelegramSettingsOut,
)
from app.services.ai import clear_prompt_context_cache
from app.services.ai_profile import ensure_ai_profile

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_business(db: Session, current_user: CurrentUser) -> Business:
    business = db.get(Business, current_user.business_id)
    if business is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


def _profile_out(business: Business) -> ProfileOut:
    return ProfileOut(
        name=business.name,
        business_type=business.business_type,
        address=business.address,
        phone=business.phone,
        default_language=business.default_language,
        timezone=business.timezone,
        business_hours=business.business_hours,
        logo_url=business.logo_url,
    )


def _telegram_out(bot_config: BotConfig | None) -> TelegramSettingsOut:
    if bot_config is None:
        return TelegramSettingsOut(
            connected=False, bot_username=None, owner_linked=False, is_active=False, last_started_at=None
        )
    return TelegramSettingsOut(
        connected=True,
        bot_username=bot_config.bot_username,
        owner_linked=bot_config.owner_chat_id is not None,
        is_active=bot_config.is_active,
        last_started_at=bot_config.last_started_at,
    )


def _ai_behavior_out(business: Business) -> AiBehaviorOut:
    return AiBehaviorOut(
        assistant_display_name=business.assistant_display_name,
        welcome_message_en=business.welcome_message_en,
        welcome_message_km=business.welcome_message_km,
        tone=business.tone,
        handoff_on_unsure=business.handoff_on_unsure,
    )


def _notifications_out(business: Business) -> NotificationPrefsOut:
    return NotificationPrefsOut(
        notify_on_lead=business.notify_on_lead,
        notify_on_payment=business.notify_on_payment,
        notify_on_handoff=business.notify_on_handoff,
    )


@router.get("", response_model=SettingsOut)
def get_settings(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> SettingsOut:
    business = _get_business(db, current_user)
    bot_config = BotConfigRepository(db, business.id).get_for_business()
    ai_profile = ensure_ai_profile(db, business)
    rules = db.query(BusinessRule).filter(BusinessRule.business_id == business.id).order_by(BusinessRule.sort_order, BusinessRule.id).all()
    db.commit()
    return SettingsOut(
        profile=_profile_out(business),
        telegram=_telegram_out(bot_config),
        ai_behavior=_ai_behavior_out(business),
        notifications=_notifications_out(business),
        ai_profile=AIProfileOut.model_validate(ai_profile, from_attributes=True),
        business_rules=[BusinessRuleOut.model_validate(rule, from_attributes=True) for rule in rules],
    )


@router.get("/core", response_model=SettingsCoreOut)
def get_core_settings(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> SettingsCoreOut:
    business = _get_business(db, current_user)
    bot_config = BotConfigRepository(db, business.id).get_for_business()
    return SettingsCoreOut(
        profile=_profile_out(business),
        telegram=_telegram_out(bot_config),
        ai_behavior=_ai_behavior_out(business),
        notifications=_notifications_out(business),
    )


@router.get("/ai-profile", response_model=SettingsAIProfileOut)
def get_ai_profile_settings(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> SettingsAIProfileOut:
    business = _get_business(db, current_user)
    ai_profile = ensure_ai_profile(db, business)
    rules = (
        db.query(BusinessRule)
        .filter(BusinessRule.business_id == business.id)
        .order_by(BusinessRule.sort_order, BusinessRule.id)
        .all()
    )
    db.commit()
    return SettingsAIProfileOut(
        ai_profile=AIProfileOut.model_validate(ai_profile, from_attributes=True),
        business_rules=[BusinessRuleOut.model_validate(rule, from_attributes=True) for rule in rules],
    )


@router.put("/ai-profile", response_model=AIProfileOut)
def update_ai_profile(payload: AIProfileUpdate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> AIProfileOut:
    business = _get_business(db, current_user)
    profile = ensure_ai_profile(db, business)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    clear_prompt_context_cache(current_user.business_id)
    db.refresh(profile)
    return AIProfileOut.model_validate(profile, from_attributes=True)


@router.post("/business-rules", response_model=BusinessRuleOut, status_code=status.HTTP_201_CREATED)
def create_business_rule(payload: BusinessRuleCreate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> BusinessRuleOut:
    rule = BusinessRule(business_id=current_user.business_id, **payload.model_dump())
    db.add(rule)
    db.commit()
    clear_prompt_context_cache(current_user.business_id)
    db.refresh(rule)
    return BusinessRuleOut.model_validate(rule, from_attributes=True)


@router.put("/business-rules/{rule_id}", response_model=BusinessRuleOut)
def update_business_rule(rule_id: int, payload: BusinessRuleUpdate, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> BusinessRuleOut:
    rule = db.query(BusinessRule).filter(BusinessRule.id == rule_id, BusinessRule.business_id == current_user.business_id).first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Business rule not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    db.commit()
    clear_prompt_context_cache(current_user.business_id)
    db.refresh(rule)
    return BusinessRuleOut.model_validate(rule, from_attributes=True)


@router.delete("/business-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business_rule(rule_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    rule = db.query(BusinessRule).filter(BusinessRule.id == rule_id, BusinessRule.business_id == current_user.business_id).first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Business rule not found")
    db.delete(rule)
    db.commit()


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileOut:
    business = _get_business(db, current_user)
    business.name = payload.name
    business.business_type = payload.business_type
    business.address = payload.address
    business.phone = payload.phone
    business.default_language = payload.default_language
    business.timezone = payload.timezone
    business.business_hours = payload.business_hours
    business.logo_url = payload.logo_url
    db.commit()
    db.refresh(business)
    return _profile_out(business)


@router.post("/telegram/disconnect", response_model=TelegramSettingsOut)
def disconnect_telegram(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> TelegramSettingsOut:
    repo = BotConfigRepository(db, current_user.business_id)
    bot_config = repo.get_for_business()
    if bot_config is not None:
        db.delete(bot_config)
        db.commit()
    return _telegram_out(None)


@router.put("/ai-behavior", response_model=AiBehaviorOut)
def update_ai_behavior(
    payload: AiBehaviorUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiBehaviorOut:
    business = _get_business(db, current_user)
    business.assistant_display_name = payload.assistant_display_name
    business.welcome_message_en = payload.welcome_message_en
    business.welcome_message_km = payload.welcome_message_km
    business.tone = payload.tone
    business.handoff_on_unsure = payload.handoff_on_unsure
    db.commit()
    db.refresh(business)
    return _ai_behavior_out(business)


@router.put("/notifications", response_model=NotificationPrefsOut)
def update_notifications(
    payload: NotificationPrefsUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationPrefsOut:
    business = _get_business(db, current_user)
    business.notify_on_lead = payload.notify_on_lead
    business.notify_on_payment = payload.notify_on_payment
    business.notify_on_handoff = payload.notify_on_handoff
    db.commit()
    db.refresh(business)
    return _notifications_out(business)


@router.delete("/knowledge", response_model=DeleteKnowledgeResponse)
def delete_all_knowledge(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> DeleteKnowledgeResponse:
    items = KnowledgeItemRepository(db, current_user.business_id).list_ordered()
    count = len(items)
    for item in items:
        db.delete(item)
    db.commit()
    return DeleteKnowledgeResponse(deleted_count=count)


@router.delete("/account", response_model=DeleteAccountResponse)
def delete_account(
    payload: DeleteAccountRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeleteAccountResponse:
    business = _get_business(db, current_user)
    if payload.confirm_name != business.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business name doesn't match — type it exactly to confirm.",
        )

    business_id = business.id
    conversation_ids = [
        c.id for c in db.query(Conversation).filter(Conversation.business_id == business_id).all()
    ]
    db.query(Lead).filter(Lead.conversation_id.in_(conversation_ids)).delete(
        synchronize_session=False
    )
    db.query(Message).filter(Message.conversation_id.in_(conversation_ids)).delete(
        synchronize_session=False
    )
    db.query(Conversation).filter(Conversation.id.in_(conversation_ids)).delete(
        synchronize_session=False
    )
    db.query(KnowledgeItem).filter(KnowledgeItem.business_id == business_id).delete(
        synchronize_session=False
    )
    db.query(BotConfig).filter(BotConfig.business_id == business_id).delete(
        synchronize_session=False
    )
    db.query(Admin).filter(Admin.business_id == business_id).delete(synchronize_session=False)
    db.query(AdminInvite).filter(AdminInvite.business_id == business_id).delete(
        synchronize_session=False
    )
    db.query(User).filter(User.business_id == business_id).delete(synchronize_session=False)
    db.delete(business)
    db.commit()
    return DeleteAccountResponse(deleted=True)
