from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from telegram import Bot
from telegram.error import TelegramError

from app.core.security import decrypt_secret
from app.core.time import utcnow
from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.message import Message, MessageDirection
from app.repositories.bot_config import BotConfigRepository
from app.repositories.conversation_cart import ConversationCartRepository
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository
from app.repositories.order import OrderRepository
from app.schemas.conversation import (
    AdminReplyRequest,
    ConversationDetail,
    ConversationOut,
    ConversationPage,
    HandoffUpdate,
    MessageOut,
)
from app.services.commerce import order_to_dict

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=ConversationPage)
def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationPage:
    conv_repo = ConversationRepository(db, current_user.business_id)
    items, total = conv_repo.list_paginated(page, page_size)

    counts = MessageRepository(db, current_user.business_id).count_for_conversations(
        [c.id for c in items]
    )
    latest_messages = MessageRepository(db, current_user.business_id).latest_for_conversations(
        [c.id for c in items]
    )
    out_items = [
        ConversationOut(
            id=c.id,
            customer_name=c.customer_name,
            customer_chat_id=c.customer_chat_id,
            started_at=c.started_at,
            last_message_at=c.last_message_at,
            handed_off=c.handed_off,
            message_count=counts.get(c.id, 0),
            latest_message=latest_messages.get(c.id).text if latest_messages.get(c.id) else None,
            latest_message_direction=latest_messages.get(c.id).direction
            if latest_messages.get(c.id)
            else None,
        )
        for c in items
    ]
    return ConversationPage(items=out_items, total=total, page=page, page_size=page_size)


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    message_limit: int | None = Query(120, ge=20, le=300),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetail:
    conv_repo = ConversationRepository(db, current_user.business_id)
    conversation = conv_repo.get(conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    messages = MessageRepository(db, current_user.business_id).list_for_conversation(
        conversation_id,
        limit=message_limit,
    )
    cart_state = None
    linked_order = None
    try:
        cart = ConversationCartRepository(db, current_user.business_id).get_for_conversation(
            conversation_id
        )
        order = OrderRepository(db, current_user.business_id).find_for_conversation(conversation_id)
        cart_state = cart.state if cart else None
        linked_order = order_to_dict(db, current_user.business_id, order) if order else None
    except SQLAlchemyError:
        db.rollback()

    return ConversationDetail(
        id=conversation.id,
        customer_name=conversation.customer_name,
        customer_chat_id=conversation.customer_chat_id,
        handed_off=conversation.handed_off,
        messages=[MessageOut.model_validate(m) for m in messages],
        cart_state=cart_state,
        linked_order=linked_order,
    )


@router.patch("/{conversation_id}/handoff", response_model=ConversationDetail)
def update_handoff(
    conversation_id: int,
    payload: HandoffUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetail:
    conversation = ConversationRepository(db, current_user.business_id).get(conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    conversation.handed_off = payload.handed_off
    db.add(conversation)
    db.commit()
    return get_conversation(
        conversation_id=conversation_id,
        message_limit=120,
        current_user=current_user,
        db=db,
    )


@router.post("/{conversation_id}/reply", response_model=MessageOut)
async def send_admin_reply(
    conversation_id: int,
    payload: AdminReplyRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    conversation = ConversationRepository(db, current_user.business_id).get(conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    bot_config = BotConfigRepository(db, current_user.business_id).get_for_business()
    if bot_config is None or not bot_config.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram bot is not connected for this workspace",
        )

    try:
        token = decrypt_secret(bot_config.telegram_bot_token_encrypted)
        await Bot(token=token).send_message(
            chat_id=conversation.customer_chat_id,
            text=payload.text.strip(),
        )
    except TelegramError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Telegram delivery failed: {exc}",
        ) from exc

    now = utcnow()
    message = Message(
        business_id=current_user.business_id,
        conversation_id=conversation.id,
        direction=MessageDirection.bot,
        text=payload.text.strip(),
        created_at=now,
    )
    conversation.last_message_at = now
    db.add(message)
    db.add(conversation)
    db.commit()
    db.refresh(message)
    return MessageOut.model_validate(message)
