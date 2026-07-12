from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository
from app.schemas.conversation import ConversationDetail, ConversationOut, ConversationPage, MessageOut

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
    out_items = [
        ConversationOut(
            id=c.id,
            customer_name=c.customer_name,
            customer_chat_id=c.customer_chat_id,
            started_at=c.started_at,
            last_message_at=c.last_message_at,
            handed_off=c.handed_off,
            message_count=counts.get(c.id, 0),
        )
        for c in items
    ]
    return ConversationPage(items=out_items, total=total, page=page, page_size=page_size)


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
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
        conversation_id
    )
    return ConversationDetail(
        id=conversation.id,
        customer_name=conversation.customer_name,
        customer_chat_id=conversation.customer_chat_id,
        handed_off=conversation.handed_off,
        messages=[MessageOut.model_validate(m) for m in messages],
    )
