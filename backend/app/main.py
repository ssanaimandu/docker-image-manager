"""Docker Image Manager – FastAPI application entry point."""

from __future__ import annotations

import os
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import load_config, get_web_port
from app.routers import sources, images, policies, cleanup, auth
from app.services.scheduler import run_scheduler
from app.utils.logger import setup_logging, get_logger
from fastapi import Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    log = get_logger("dim")
    load_config()
    log.info("Docker Image Manager started on port %s", get_web_port())
    
    # Start the automatic cleanup scheduler
    scheduler_task = asyncio.create_task(run_scheduler())
    
    yield
    
    scheduler_task.cancel()
    log.info("Docker Image Manager shutting down")


app = FastAPI(
    title="Docker Image Manager",
    description="Unified management for Docker images across engines, registries and Artifactory",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – allow the dev Vite server during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(images.router)
app.include_router(policies.router)
app.include_router(cleanup.router)


# Health check
@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve React static files in production
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")

@app.exception_handler(StarletteHTTPException)
async def spa_fallback_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api/"):
        index_file = _static_dir / "index.html"
        if index_file.is_file():
            return FileResponse(str(index_file))
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
