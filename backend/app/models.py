"""Pydantic models for Docker Image Manager."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    DOCKER_ENGINE = "docker_engine"
    PRIVATE_REGISTRY = "private_registry"
    ARTIFACTORY = "artifactory"


# ---------------------------------------------------------------------------
# Connection details per source type
# ---------------------------------------------------------------------------

class DockerEngineConnection(BaseModel):
    socket_path: str = "/var/run/docker.sock"
    host: Optional[str] = None  # e.g. tcp://192.168.1.100:2375
    tls: bool = False


class RegistryConnection(BaseModel):
    url: str = ""
    username: str = ""
    password: str = ""
    insecure: bool = False  # allow HTTP


class ArtifactoryConnection(BaseModel):
    url: str = ""
    repository: str = "docker-local"
    username: str = ""
    password: str = ""
    api_key: str = ""
    use_registry_api: bool = False


# ---------------------------------------------------------------------------
# Source
# ---------------------------------------------------------------------------

class Source(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    type: SourceType = SourceType.DOCKER_ENGINE
    connection: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True


# ---------------------------------------------------------------------------
# Image policy
# ---------------------------------------------------------------------------

class ImagePolicy(BaseModel):
    keep_tags: Optional[int] = None  # None → use default
    exclude_from_cleanup: bool = False
    protected_tags: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# App config  (persisted in JSON)
# ---------------------------------------------------------------------------

class LocalAuth(BaseModel):
    username: str = "admin"
    password_hash: str = "$2b$12$/h76Yg0v4uIlB5bnh9yGvO8mMktOQ97zKLX8NOFdILSQbKdaT3FGG" # bcrypt for "admin"

class GithubOAuth(BaseModel):
    enabled: bool = False
    client_id: str = ""
    client_secret: str = ""

class GenericOIDC(BaseModel):
    enabled: bool = False
    provider_name: str = "Authelia"
    client_id: str = ""
    client_secret: str = ""
    authorization_url: str = ""
    token_url: str = ""
    userinfo_url: str = ""
    scope: str = "openid profile email"

class OAuthConfig(BaseModel):
    github: GithubOAuth = Field(default_factory=GithubOAuth)
    oidc: GenericOIDC = Field(default_factory=GenericOIDC)

class AuthConfig(BaseModel):
    enabled: bool = True
    jwt_secret: str = Field(default_factory=lambda: str(uuid.uuid4()))
    local: LocalAuth = Field(default_factory=LocalAuth)
    oauth: OAuthConfig = Field(default_factory=OAuthConfig)


# ---------------------------------------------------------------------------
# App config  (persisted in JSON)
# ---------------------------------------------------------------------------

class AppConfig(BaseModel):
    default_keep_tags: int = 5
    auth: AuthConfig = Field(default_factory=AuthConfig)
    sources: list[Source] = Field(default_factory=list)
    image_policies: dict[str, ImagePolicy] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# API response models
# ---------------------------------------------------------------------------

class ImageInfo(BaseModel):
    name: str
    tag_count: int = 0
    tags: list[TagInfo] = Field(default_factory=list)
    source_id: str = ""
    source_name: str = ""
    source_type: SourceType = SourceType.DOCKER_ENGINE


class TagInfo(BaseModel):
    tag: str
    digest: Optional[str] = None
    size: Optional[int] = None  # bytes
    created: Optional[str] = None  # ISO-8601
    is_running: bool = False  # only for docker engine
    is_protected: bool = False


class CleanupPreviewItem(BaseModel):
    source_id: str
    source_name: str
    source_type: SourceType
    image_name: str
    tags_to_delete: list[str]
    tags_to_keep: list[str]
    reason_kept: dict[str, str] = Field(default_factory=dict)  # tag → reason


class CleanupResult(BaseModel):
    total_deleted: int = 0
    total_failed: int = 0
    details: list[CleanupResultDetail] = Field(default_factory=list)


class CleanupResultDetail(BaseModel):
    source_id: str
    image_name: str
    tag: str
    success: bool
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class SourceCreate(BaseModel):
    name: str
    type: SourceType
    connection: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    connection: Optional[dict[str, Any]] = None
    enabled: Optional[bool] = None


class PolicyUpdate(BaseModel):
    keep_tags: Optional[int] = None
    exclude_from_cleanup: Optional[bool] = None
    protected_tags: Optional[list[str]] = None


class DefaultPolicyUpdate(BaseModel):
    default_keep_tags: int
