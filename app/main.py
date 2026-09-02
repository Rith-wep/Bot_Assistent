"""FastAPI application entry point.

This module creates the web application, attaches middleware and API routers,
and serves the compiled frontend when a production build is present.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


# ---------------------------------------------------------------------------
# Application setup
# ---------------------------------------------------------------------------


app = FastAPI(title="Khmer AI Customer Assistant")


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------


app.include_router(api_router)


# ---------------------------------------------------------------------------
# Basic health check
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    """Return a minimal process-level health response."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Production frontend serving
# ---------------------------------------------------------------------------


if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )


    @app.get("/{path:path}", include_in_schema=False)
    def serve_frontend(path: str):
        """Serve built frontend assets and fall back to the SPA entry file."""
        requested_file = FRONTEND_DIST / path
        if path and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(FRONTEND_DIST / "index.html")
else:

    @app.get("/{path:path}", include_in_schema=False)
    def frontend_not_built(path: str):
        """Return 404 for frontend paths when the frontend has not been built."""
        raise HTTPException(status_code=404, detail="Frontend build not found")
