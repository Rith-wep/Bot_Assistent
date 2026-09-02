"""Central API router registry.

Every feature router is included here so app/main.py only needs to mount one
API router. Keeping this file flat makes it easy to see the backend surface.
"""

from fastapi import APIRouter

from app.routers import (
    admin_console,
    admins,
    auth,
    commerce,
    conversations,
    dashboard,
    demo,
    gaps,
    health,
    knowledge,
    leads,
    onboarding,
    settings,
)

api_router = APIRouter()

# ---------------------------------------------------------------------------
# Tenant/account setup and dashboard
# ---------------------------------------------------------------------------


api_router.include_router(auth.router)
api_router.include_router(onboarding.router)
api_router.include_router(dashboard.router)


# ---------------------------------------------------------------------------
# Customer assistant knowledge, commerce, and conversation workflows
# ---------------------------------------------------------------------------


api_router.include_router(knowledge.router)
api_router.include_router(commerce.router)
api_router.include_router(leads.router)
api_router.include_router(conversations.router)


# ---------------------------------------------------------------------------
# Workspace settings, admins, gaps, health, and internal/demo tools
# ---------------------------------------------------------------------------


api_router.include_router(settings.router)
api_router.include_router(admins.router)
api_router.include_router(gaps.router)
api_router.include_router(health.router)
api_router.include_router(admin_console.router)
api_router.include_router(demo.router)
