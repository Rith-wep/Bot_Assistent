from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

## Initialize the FastAPI application
app = FastAPI(title="Khmer AI Customer Assistant")


## CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

## Include API router
app.include_router(api_router)

### Health check endpoint
@app.get("/health")
def health():
    return {"status": "ok"}


if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )


    @app.get("/{path:path}", include_in_schema=False)
    def serve_frontend(path: str):
        requested_file = FRONTEND_DIST / path
        if path and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(FRONTEND_DIST / "index.html")
else:

    @app.get("/{path:path}", include_in_schema=False)
    def frontend_not_built(path: str):
        raise HTTPException(status_code=404, detail="Frontend build not found")
