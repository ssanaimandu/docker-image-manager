"""Cleanup execution API."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.services.cleanup import build_cleanup_preview, execute_cleanup
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/cleanup", tags=["cleanup"], dependencies=[Depends(get_current_user)])


class CleanupRequest(BaseModel):
    source_ids: Optional[list[str]] = None  # None = all sources


@router.post("/preview")
def preview(body: CleanupRequest):
    """Dry-run: show what would be deleted."""
    return build_cleanup_preview(body.source_ids)


@router.post("/execute")
def execute(body: CleanupRequest):
    """Execute cleanup (irreversible)."""
    return execute_cleanup(body.source_ids)
