from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    admin_console,
    admins,
    auth,
    conversations,
    dashboard,
    demo,
    gaps,
    knowledge,
    leads,
    onboarding,
    settings,
)

app = FastAPI(title="Khmer AI Customer Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(dashboard.router)
app.include_router(knowledge.router)
app.include_router(leads.router)
app.include_router(conversations.router)
app.include_router(settings.router)
app.include_router(admins.router)
app.include_router(gaps.router)
app.include_router(admin_console.router)
app.include_router(demo.router)


@app.get("/health")
def health():
    return {"status": "ok"}
