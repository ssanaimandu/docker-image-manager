"""Docker Engine client – communicates via docker.sock or TCP."""

from __future__ import annotations

from typing import Any

import docker
from docker.errors import APIError, DockerException

from app.models import ImageInfo, TagInfo, SourceType
from app.utils.logger import get_logger

log = get_logger(__name__)


class DockerEngineService:
    """Manage images on a Docker Engine via docker.sock or TCP."""

    def __init__(self, connection: dict[str, Any]):
        host = connection.get("host")
        socket_path = connection.get("socket_path", "/var/run/docker.sock")
        use_tls = connection.get("tls", False)

        if host:
            tls_config = docker.tls.TLSConfig() if use_tls else False
            self.client = docker.DockerClient(base_url=host, tls=tls_config)
        else:
            self.client = docker.DockerClient(
                base_url=f"unix://{socket_path}"
            )

    # ------------------------------------------------------------------
    # Connectivity
    # ------------------------------------------------------------------

    def ping(self) -> bool:
        try:
            return self.client.ping()
        except DockerException:
            return False

    # ------------------------------------------------------------------
    # Running containers  (image tag → set)
    # ------------------------------------------------------------------

    def get_running_tags(self) -> set[str]:
        """Return set of image:tag strings currently used by running containers."""
        running: set[str] = set()
        try:
            for ctr in self.client.containers.list(all=False):
                img_tags = ctr.image.tags if ctr.image else []
                for t in img_tags:
                    running.add(t)
        except DockerException as exc:
            log.warning("Failed to list running containers: %s", exc)
        return running

    # ------------------------------------------------------------------
    # Image listing
    # ------------------------------------------------------------------

    def list_images(self, source_id: str, source_name: str) -> list[ImageInfo]:
        """List all images grouped by repository name."""
        running_tags = self.get_running_tags()
        repo_map: dict[str, list[TagInfo]] = {}

        try:
            images = self.client.images.list(all=False)
        except DockerException as exc:
            log.error("Failed to list images: %s", exc)
            return []

        for img in images:
            for full_tag in img.tags:
                # full_tag looks like  "repo:tag" or "registry/repo:tag"
                if ":" in full_tag:
                    repo, tag = full_tag.rsplit(":", 1)
                else:
                    repo, tag = full_tag, "latest"

                created = img.attrs.get("Created", "")
                size = img.attrs.get("Size", 0)
                img_id = img.id

                tag_info = TagInfo(
                    tag=tag,
                    digest=img_id,
                    size=size,
                    created=created,
                    is_running=full_tag in running_tags,
                )

                repo_map.setdefault(repo, []).append(tag_info)

        result: list[ImageInfo] = []
        for repo, tags in sorted(repo_map.items()):
            result.append(
                ImageInfo(
                    name=repo,
                    tag_count=len(tags),
                    tags=sorted(tags, key=lambda t: t.created or "", reverse=True),
                    source_id=source_id,
                    source_name=source_name,
                    source_type=SourceType.DOCKER_ENGINE,
                )
            )
        return result

    # ------------------------------------------------------------------
    # Deletion
    # ------------------------------------------------------------------

    def delete_image(self, image_name: str, tag: str, force: bool = False) -> bool:
        """Delete a specific image:tag. Returns True on success."""
        full = f"{image_name}:{tag}"
        try:
            self.client.images.remove(image=full, force=force)
            log.info("Deleted image %s", full)
            return True
        except APIError as exc:
            log.error("Failed to delete %s: %s", full, exc)
            return False
