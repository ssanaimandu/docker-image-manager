"""Source management API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends

from app.config import get_current_config, save_config, get_config_path
from app.models import Source, SourceCreate, SourceUpdate, SourceType
from app.services.docker_engine import DockerEngineService
from app.services.private_registry import PrivateRegistryService
from app.services.artifactory import ArtifactoryService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/sources", tags=["sources"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_sources():
    cfg = get_current_config()
    return cfg.sources


@router.get("/{source_id}")
def get_source(source_id: str):
    cfg = get_current_config()
    for s in cfg.sources:
        if s.id == source_id:
            return s
    raise HTTPException(404, "Source not found")


@router.post("", status_code=201)
def create_source(body: SourceCreate):
    cfg = get_current_config()
    src = Source(
        name=body.name,
        type=body.type,
        connection=body.connection,
        enabled=body.enabled,
    )
    cfg.sources.append(src)
    save_config(cfg)
    return src


@router.put("/{source_id}")
def update_source(source_id: str, body: SourceUpdate):
    cfg = get_current_config()
    for s in cfg.sources:
        if s.id == source_id:
            if body.name is not None:
                s.name = body.name
            if body.connection is not None:
                s.connection = body.connection
            if body.enabled is not None:
                s.enabled = body.enabled
            save_config(cfg)
            return s
    raise HTTPException(404, "Source not found")


@router.delete("/{source_id}", status_code=204)
def delete_source(source_id: str):
    cfg = get_current_config()
    original_len = len(cfg.sources)
    cfg.sources = [s for s in cfg.sources if s.id != source_id]
    if len(cfg.sources) == original_len:
        raise HTTPException(404, "Source not found")
    save_config(cfg)


@router.post("/{source_id}/test")
def test_source(source_id: str):
    """Test connectivity to a source."""
    cfg = get_current_config()
    source = None
    for s in cfg.sources:
        if s.id == source_id:
            source = s
            break
    if not source:
        raise HTTPException(404, "Source not found")

    try:
        if source.type == SourceType.DOCKER_ENGINE:
            svc = DockerEngineService(source.connection)
        elif source.type == SourceType.PRIVATE_REGISTRY:
            svc = PrivateRegistryService(source.connection)
        elif source.type == SourceType.ARTIFACTORY:
            svc = ArtifactoryService(source.connection)
        else:
            raise HTTPException(400, "Unknown source type")

        ok = svc.ping()
        return {"success": ok, "message": "Connected" if ok else "Connection failed"}
    except Exception as exc:
        return {"success": False, "message": str(exc)}
