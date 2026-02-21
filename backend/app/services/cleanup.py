"""Cleanup engine – applies retention policies across all sources."""

from __future__ import annotations

from app.config import get_current_config
from app.models import (
    AppConfig,
    CleanupPreviewItem,
    CleanupResult,
    CleanupResultDetail,
    ImageInfo,
    ImagePolicy,
    SourceType,
)
from app.services.docker_engine import DockerEngineService
from app.services.private_registry import PrivateRegistryService
from app.services.artifactory import ArtifactoryService
from app.utils.logger import get_logger

log = get_logger(__name__)


def _get_service(source):
    """Instantiate the correct service for a source."""
    stype = source.type
    conn = source.connection
    if stype == SourceType.DOCKER_ENGINE:
        return DockerEngineService(conn)
    elif stype == SourceType.PRIVATE_REGISTRY:
        return PrivateRegistryService(conn)
    elif stype == SourceType.ARTIFACTORY:
        return ArtifactoryService(conn)
    return None


def _resolve_policy(image_name: str, cfg: AppConfig) -> ImagePolicy:
    """Return the effective policy for an image."""
    return cfg.image_policies.get(image_name, ImagePolicy())


def build_cleanup_preview(source_ids: list[str] | None = None) -> list[CleanupPreviewItem]:
    """Dry-run: compute what tags would be deleted without touching anything."""
    cfg = get_current_config()
    previews: list[CleanupPreviewItem] = []

    for source in cfg.sources:
        if not source.enabled:
            continue
        if source_ids and source.id not in source_ids:
            continue

        try:
            svc = _get_service(source)
            if svc is None:
                continue
            images = svc.list_images(source.id, source.name)
        except Exception as exc:
            log.error("Error listing images from %s: %s", source.name, exc)
            continue

        for img in images:
            policy = _resolve_policy(img.name, cfg)

            # Skip excluded images
            if policy.exclude_from_cleanup:
                continue

            keep_count = policy.keep_tags if policy.keep_tags is not None else cfg.default_keep_tags
            protected = set(policy.protected_tags)

            # Sort tags by created date descending (newest first)
            sorted_tags = sorted(
                img.tags,
                key=lambda t: t.created or "",
                reverse=True,
            )

            tags_to_keep: list[str] = []
            tags_to_delete: list[str] = []
            reason_kept: dict[str, str] = {}
            kept_count = 0
            freed_bytes = 0

            for tinfo in sorted_tags:
                tag = tinfo.tag

                # Protected by policy
                if tag in protected:
                    tags_to_keep.append(tag)
                    reason_kept[tag] = "protected_tag"
                    continue

                # Running container (Docker Engine only)
                if tinfo.is_running:
                    tags_to_keep.append(tag)
                    reason_kept[tag] = "running_container"
                    continue

                # Retention count
                if kept_count < keep_count:
                    tags_to_keep.append(tag)
                    reason_kept[tag] = "retention_policy"
                    kept_count += 1
                else:
                    tags_to_delete.append(tag)
                    if tinfo.size:
                        freed_bytes += tinfo.size

            if tags_to_delete:
                previews.append(
                    CleanupPreviewItem(
                        source_id=source.id,
                        source_name=source.name,
                        source_type=source.type,
                        image_name=img.name,
                        tags_to_delete=tags_to_delete,
                        tags_to_keep=tags_to_keep,
                        reason_kept=reason_kept,
                        freed_bytes=freed_bytes,
                    )
                )

    return previews


def execute_cleanup(source_ids: list[str] | None = None) -> CleanupResult:
    """Actually delete tags according to the retention policy."""
    cfg = get_current_config()
    result = CleanupResult()

    preview = build_cleanup_preview(source_ids)

    # Build source lookup
    source_map = {s.id: s for s in cfg.sources}

    for item in preview:
        source = source_map.get(item.source_id)
        if not source:
            continue

        svc = _get_service(source)
        if svc is None:
            continue

        for tag in item.tags_to_delete:
            try:
                if source.type == SourceType.DOCKER_ENGINE:
                    ok = svc.delete_image(item.image_name, tag)
                else:
                    ok = svc.delete_tag(item.image_name, tag)

                detail = CleanupResultDetail(
                    source_id=item.source_id,
                    image_name=item.image_name,
                    tag=tag,
                    success=ok,
                    error=None if ok else "Delete returned False",
                )
                result.details.append(detail)
                if ok:
                    result.total_deleted += 1
                    # Approximate the freed size based on preview
                    result.total_freed_bytes += item.freed_bytes // len(item.tags_to_delete) if item.freed_bytes else 0
                else:
                    result.total_failed += 1
            except Exception as exc:
                result.total_failed += 1
                result.details.append(
                    CleanupResultDetail(
                        source_id=item.source_id,
                        image_name=item.image_name,
                        tag=tag,
                        success=False,
                        error=str(exc),
                    )
                )

    return result
