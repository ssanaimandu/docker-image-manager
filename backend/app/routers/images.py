"""Image listing API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends

from app.config import get_current_config
from app.models import SourceType
from app.services.docker_engine import DockerEngineService
from app.services.private_registry import PrivateRegistryService
from app.services.artifactory import ArtifactoryService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/images", tags=["images"], dependencies=[Depends(get_current_user)])


def _get_service(source):
    if source.type == SourceType.DOCKER_ENGINE:
        return DockerEngineService(source.connection)
    elif source.type == SourceType.PRIVATE_REGISTRY:
        return PrivateRegistryService(source.connection)
    elif source.type == SourceType.ARTIFACTORY:
        return ArtifactoryService(source.connection)
    return None


@router.get("")
def list_all_images():
    """List images from all enabled sources."""
    cfg = get_current_config()
    all_images = []
    for source in cfg.sources:
        if not source.enabled:
            continue
        try:
            svc = _get_service(source)
            if svc is None:
                continue
            images = svc.list_images(source.id, source.name)
            all_images.extend(images)
        except Exception as exc:
            # Return error info instead of crashing the whole request
            all_images.append({
                "name": f"[Error] {source.name}",
                "tag_count": 0,
                "tags": [],
                "source_id": source.id,
                "source_name": source.name,
                "source_type": source.type,
                "error": str(exc),
            })
    return all_images


@router.get("/by-source/{source_id}")
def list_images_by_source(source_id: str):
    """List images from a specific source."""
    cfg = get_current_config()
    source = None
    for s in cfg.sources:
        if s.id == source_id:
            source = s
            break
    if not source:
        raise HTTPException(404, "Source not found")

    svc = _get_service(source)
    if svc is None:
        raise HTTPException(400, "Unsupported source type")

    try:
        return svc.list_images(source.id, source.name)
    except Exception as exc:
        raise HTTPException(500, str(exc))
