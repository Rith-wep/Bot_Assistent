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

## Include individual routers for different modules
api_router.include_router(auth.router)
api_router.include_router(onboarding.router)
api_router.include_router(dashboard.router)
api_router.include_router(knowledge.router)
api_router.include_router(commerce.router)
api_router.include_router(leads.router)
api_router.include_router(conversations.router)
api_router.include_router(settings.router)
api_router.include_router(admins.router)
api_router.include_router(gaps.router)
api_router.include_router(health.router)
api_router.include_router(admin_console.router)
api_router.include_router(demo.router)
