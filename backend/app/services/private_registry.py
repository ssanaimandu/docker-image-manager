"""Private Docker Registry client – Docker Registry HTTP API V2."""

from __future__ import annotations

from typing import Any

import httpx

from app.models import ImageInfo, TagInfo, SourceType
from app.utils.logger import get_logger

log = get_logger(__name__)

_TIMEOUT = 30.0


class PrivateRegistryService:
    """Interact with a Docker Registry via HTTP API V2."""

    def __init__(self, connection: dict[str, Any]):
        self.base_url = connection.get("url", "").rstrip("/")
        self.username = connection.get("username", "")
        self.password = connection.get("password", "")
        self.insecure = connection.get("insecure", False)
        self._auth = (
            (self.username, self.password) if self.username else None
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.base_url,
            auth=self._auth,
            verify=not self.insecure,
            timeout=_TIMEOUT,
        )

    # ------------------------------------------------------------------
    # Connectivity
    # ------------------------------------------------------------------

    def ping(self) -> bool:
        try:
            with self._client() as c:
                r = c.get("/v2/")
                return r.status_code in (200, 401)
        except httpx.HTTPError:
            return False

    # ------------------------------------------------------------------
    # Catalog / tags
    # ------------------------------------------------------------------

    def list_repositories(self) -> list[str]:
        try:
            with self._client() as c:
                r = c.get("/v2/_catalog", params={"n": 10000})
                r.raise_for_status()
                return r.json().get("repositories", [])
        except httpx.HTTPError as exc:
            log.error("Failed to list repos: %s", exc)
            return []

    def list_tags(self, repo: str) -> list[str]:
        try:
            with self._client() as c:
                r = c.get(f"/v2/{repo}/tags/list")
                r.raise_for_status()
                return r.json().get("tags") or []
        except httpx.HTTPError as exc:
            log.error("Failed to list tags for %s: %s", repo, exc)
            return []

    def get_manifest_digest(self, repo: str, tag: str) -> str | None:
        """Get the digest for a manifest (needed for deletion)."""
        try:
            with self._client() as c:
                r = c.get(
                    f"/v2/{repo}/manifests/{tag}",
                    headers={
                        "Accept": "application/vnd.docker.distribution.manifest.v2+json"
                    },
                )
                r.raise_for_status()
                return r.headers.get("Docker-Content-Digest")
        except httpx.HTTPError as exc:
            log.error("Failed to get digest for %s:%s: %s", repo, tag, exc)
            return None

    def get_manifest_info(self, repo: str, tag: str) -> dict[str, Any]:
        """Return basic info from the manifest (created date, size)."""
        info: dict[str, Any] = {}
        try:
            with self._client() as c:
                r = c.get(
                    f"/v2/{repo}/manifests/{tag}",
                    headers={
                        "Accept": "application/vnd.docker.distribution.manifest.v2+json"
                    },
                )
                r.raise_for_status()
                data = r.json()
                info["digest"] = r.headers.get("Docker-Content-Digest", "")
                config = data.get("config", {})
                layers = data.get("layers", [])
                info["size"] = sum(l.get("size", 0) for l in layers) + config.get("size", 0)
        except httpx.HTTPError:
            pass
        return info

    # ------------------------------------------------------------------
    # Image listing
    # ------------------------------------------------------------------

    def list_images(self, source_id: str, source_name: str) -> list[ImageInfo]:
        repos = self.list_repositories()
        result: list[ImageInfo] = []
        for repo in repos:
            tags_raw = self.list_tags(repo)
            tags: list[TagInfo] = []
            for t in tags_raw:
                manifest_info = self.get_manifest_info(repo, t)
                tags.append(
                    TagInfo(
                        tag=t,
                        digest=manifest_info.get("digest"),
                        size=manifest_info.get("size"),
                    )
                )
            result.append(
                ImageInfo(
                    name=repo,
                    tag_count=len(tags),
                    tags=tags,
                    source_id=source_id,
                    source_name=source_name,
                    source_type=SourceType.PRIVATE_REGISTRY,
                )
            )
        return result

    # ------------------------------------------------------------------
    # Deletion
    # ------------------------------------------------------------------

    def delete_tag(self, repo: str, tag: str) -> bool:
        digest = self.get_manifest_digest(repo, tag)
        if not digest:
            log.error("Cannot delete %s:%s – digest not found", repo, tag)
            return False
        try:
            with self._client() as c:
                r = c.delete(f"/v2/{repo}/manifests/{digest}")
                if r.status_code == 202:
                    log.info("Deleted %s:%s (digest %s)", repo, tag, digest)
                    return True
                log.error(
                    "Delete %s:%s returned %s: %s",
                    repo, tag, r.status_code, r.text,
                )
                return False
        except httpx.HTTPError as exc:
            log.error("Failed to delete %s:%s: %s", repo, tag, exc)
            return False
