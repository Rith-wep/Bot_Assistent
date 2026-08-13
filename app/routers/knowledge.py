import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.repositories.knowledge_item import KnowledgeItemRepository
from app.schemas.knowledge import (
    KnowledgeExtractRequest,
    KnowledgeExtractResponse,
    KnowledgeItemCreate,
    KnowledgeItemOut,
    KnowledgeItemUpdate,
)
from app.services.ai import extract_knowledge_items

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

# In-process sliding window, keyed by business_id — same approach as the demo
# endpoint's IP-keyed limiter (no new infra for a monolith at this scale).
# Quick-add is a heavier AI call than a single chat reply, so keep it tighter
# than a customer's normal message rate.
_EXTRACT_RATE_WINDOW_SECONDS = 600
_EXTRACT_RATE_MAX_REQUESTS = 8
_extract_request_log: dict[int, list[float]] = {}


def _check_extract_rate_limit(business_id: int) -> None:
    now = time.monotonic()
    timestamps = [
        t for t in _extract_request_log.get(business_id, []) if now - t < _EXTRACT_RATE_WINDOW_SECONDS
    ]
    if len(timestamps) >= _EXTRACT_RATE_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many AI quick-add requests — please wait a few minutes and try again.",
        )
    timestamps.append(now)
    _extract_request_log[business_id] = timestamps


@router.get("", response_model=list[KnowledgeItemOut])
def list_knowledge(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[KnowledgeItemOut]:
    return KnowledgeItemRepository(db, current_user.business_id).list_ordered()


@router.post("", response_model=KnowledgeItemOut, status_code=status.HTTP_201_CREATED)
def create_knowledge(
    payload: KnowledgeItemCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KnowledgeItemOut:
    item = KnowledgeItemRepository(db, current_user.business_id).create(**payload.model_dump())
    db.commit()
    db.refresh(item)
    return item


@router.post("/ai-extract", response_model=KnowledgeExtractResponse)
async def ai_extract_knowledge(
    payload: KnowledgeExtractRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> KnowledgeExtractResponse:
    _check_extract_rate_limit(current_user.business_id)

    items = await extract_knowledge_items(payload.text)
    if items is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not analyze this text right now — please try again in a moment.",
        )
    return KnowledgeExtractResponse(items=items)


@router.put("/{item_id}", response_model=KnowledgeItemOut)
def update_knowledge(
    item_id: int,
    payload: KnowledgeItemUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KnowledgeItemOut:
    repo = KnowledgeItemRepository(db, current_user.business_id)
    item = repo.get(item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge(
    item_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    repo = KnowledgeItemRepository(db, current_user.business_id)
    if not repo.delete(item_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")
    db.commit()
