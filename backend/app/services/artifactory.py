"""JFrog Artifactory Docker registry client."""

from __future__ import annotations

from typing import Any

import httpx

from app.models import ImageInfo, TagInfo, SourceType
from app.services.private_registry import PrivateRegistryService
from app.utils.logger import get_logger

log = get_logger(__name__)

_TIMEOUT = 30.0


class ArtifactoryService:
    """Interact with JFrog Artifactory's Docker repository.

    Supports two modes:
    1. JFrog REST API (default)  – uses /api/docker/ endpoints
    2. Registry API V2 fallback  – when ``use_registry_api`` is True
    """

    def __init__(self, connection: dict[str, Any]):
        self.base_url = connection.get("url", "").rstrip("/")
        self.repository = connection.get("repository", "docker-local")
        self.username = connection.get("username", "")
        self.password = connection.get("password", "")
        self.api_key = connection.get("api_key", "")
        self.use_registry_api = connection.get("use_registry_api", False)

        # build a registry-api fallback if required
        if self.use_registry_api:
            registry_conn = {
                "url": f"{self.base_url}/v2/{self.repository}",
                "username": self.username,
                "password": self.password or self.api_key,
            }
            self._registry = PrivateRegistryService(registry_conn)
        else:
            self._registry = None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.api_key:
            headers["X-JFrog-Art-Api"] = self.api_key
        return headers

    def _auth(self):
        if self.username and (self.password or self.api_key):
            return (self.username, self.password or self.api_key)
        return None

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.base_url,
            auth=self._auth(),
            headers=self._headers(),
            timeout=_TIMEOUT,
        )

    # ------------------------------------------------------------------
    # Connectivity
    # ------------------------------------------------------------------

    def ping(self) -> bool:
        if self.use_registry_api and self._registry:
            return self._registry.ping()
        try:
            with self._client() as c:
                r = c.get("/api/system/ping")
                return r.status_code == 200
        except httpx.HTTPError:
            return False

    # ------------------------------------------------------------------
    # Catalog / tags  (JFrog REST API)
    # ------------------------------------------------------------------

    def _list_repositories_rest(self) -> list[str]:
        try:
            with self._client() as c:
                r = c.get(f"/api/docker/{self.repository}/v2/_catalog")
                r.raise_for_status()
                return r.json().get("repositories", [])
        except httpx.HTTPError as exc:
            log.error("Artifactory list repos failed: %s", exc)
            return []

    def _list_tags_rest(self, image: str) -> list[str]:
        try:
            with self._client() as c:
                r = c.get(
                    f"/api/docker/{self.repository}/v2/{image}/tags/list"
                )
                r.raise_for_status()
                return r.json().get("tags") or []
        except httpx.HTTPError as exc:
            log.error("Artifactory list tags for %s failed: %s", image, exc)
            return []

    def _get_tag_info_rest(self, image: str, tag: str) -> dict[str, Any]:
        info: dict[str, Any] = {}
        try:
            with self._client() as c:
                # Artifactory-specific: get storage info
                path = f"/api/storage/{self.repository}/{image}/{tag}"
                r = c.get(path)
                if r.status_code == 200:
                    data = r.json()
                    info["size"] = data.get("size", 0)
                    info["created"] = data.get("created", "")
        except httpx.HTTPError:
            pass
        return info

    # ------------------------------------------------------------------
    # Image listing
    # ------------------------------------------------------------------

    def list_images(self, source_id: str, source_name: str) -> list[ImageInfo]:
        if self.use_registry_api and self._registry:
            images = self._registry.list_images(source_id, source_name)
            for img in images:
                img.source_type = SourceType.ARTIFACTORY
            return images

        repos = self._list_repositories_rest()
        result: list[ImageInfo] = []
        for repo in repos:
            tags_raw = self._list_tags_rest(repo)
            tags: list[TagInfo] = []
            for t in tags_raw:
                info = self._get_tag_info_rest(repo, t)
                tags.append(
                    TagInfo(
                        tag=t,
                        size=info.get("size"),
                        created=info.get("created"),
                    )
                )
            result.append(
                ImageInfo(
                    name=repo,
                    tag_count=len(tags),
                    tags=tags,
                    source_id=source_id,
                    source_name=source_name,
                    source_type=SourceType.ARTIFACTORY,
                )
            )
        return result

    # ------------------------------------------------------------------
    # Deletion
    # ------------------------------------------------------------------

    def delete_tag(self, image: str, tag: str) -> bool:
        if self.use_registry_api and self._registry:
            return self._registry.delete_tag(image, tag)

        try:
            with self._client() as c:
                # Delete the tag manifest via Artifactory REST
                r = c.delete(
                    f"/api/docker/{self.repository}/v2/{image}/manifests/{tag}"
                )
                if r.status_code in (200, 202, 204):
                    log.info("Artifactory: deleted %s:%s", image, tag)
                    return True
                log.error(
                    "Artifactory delete %s:%s → %s: %s",
                    image, tag, r.status_code, r.text,
                )
                return False
        except httpx.HTTPError as exc:
            log.error("Artifactory delete %s:%s failed: %s", image, tag, exc)
            return False
