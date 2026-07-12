"""Public live demo behind the landing page — the one unauthenticated,
cost-incurring endpoint in the app, so it gets its own guards.

Reuses the exact no-persistence preview-chat path onboarding's "try it
out" screen already uses (app.services.ai.generate_preview_reply):
nothing is written to conversations/messages/leads and no owner
notifications fire, so the demo is fully isolated from real tenants by
construction — not just by convention. It only ever talks to the single
seeded Business.is_demo=True row (scripts/seed_demo_business.py).

Rate limiting is a simple in-process sliding window keyed by client IP —
no new infra (Redis etc.) for a monolith at this scale. This means it
resets on deploy and doesn't share state across multiple app instances;
acceptable for a demo endpoint, revisit if that ever becomes a problem.
"""
import time

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.business import Business
from app.services.ai import generate_preview_reply

router = APIRouter(prefix="/api/demo", tags=["demo"])

MAX_MESSAGE_LENGTH = 300
MAX_HISTORY_MESSAGES = 6
RATE_LIMIT_WINDOW_SECONDS = 300
RATE_LIMIT_MAX_REQUESTS = 8

_request_log: dict[str, list[float]] = {}


class DemoHistoryItem(BaseModel):
    role: str
    text: str = Field(max_length=MAX_MESSAGE_LENGTH)


class DemoChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: list[DemoHistoryItem] = Field(default_factory=list)


class DemoChatResponse(BaseModel):
    reply: str


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    timestamps = [t for t in _request_log.get(ip, []) if now - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many demo messages — please wait a few minutes and try again.",
        )
    timestamps.append(now)
    _request_log[ip] = timestamps


@router.post("/chat", response_model=DemoChatResponse)
async def demo_chat(payload: DemoChatRequest, request: Request) -> DemoChatResponse:
    _check_rate_limit(_client_ip(request))

    history = [
        {"role": item.role, "text": item.text}
        for item in payload.history[-MAX_HISTORY_MESSAGES:]
        if item.role in ("customer", "bot")
    ]

    db: Session = SessionLocal()
    try:
        business = db.query(Business).filter(Business.is_demo.is_(True)).first()
        if business is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The live demo isn't available right now.",
            )
        reply = await generate_preview_reply(db, business.id, history, payload.message)
        return DemoChatResponse(reply=reply)
    finally:
        db.close()
