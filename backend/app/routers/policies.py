"""Retention policy API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status, Depends

from app.config import get_current_config, save_config, get_config_path
from app.models import DefaultPolicyUpdate, ImagePolicy, PolicyUpdate
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/policies", tags=["policies"], dependencies=[Depends(get_current_user)])


@router.get("")
def get_all_policies():
    cfg = get_current_config()
    return {
        "default_keep_tags": cfg.default_keep_tags,
        "image_policies": cfg.image_policies,
    }


@router.put("/default")
def update_default_policy(body: DefaultPolicyUpdate):
    cfg = get_current_config()
    cfg.default_keep_tags = body.default_keep_tags
    save_config(cfg)
    return {"default_keep_tags": cfg.default_keep_tags}


@router.get("/{image_name:path}")
def get_image_policy(image_name: str):
    cfg = get_current_config()
    policy = cfg.image_policies.get(image_name)
    if policy is None:
        return ImagePolicy()
    return policy


@router.put("/{image_name:path}")
def update_image_policy(image_name: str, body: PolicyUpdate):
    cfg = get_current_config()
    existing = cfg.image_policies.get(image_name, ImagePolicy())

    if body.keep_tags is not None:
        existing.keep_tags = body.keep_tags
    if body.exclude_from_cleanup is not None:
        existing.exclude_from_cleanup = body.exclude_from_cleanup
    if body.protected_tags is not None:
        seen = set()
        unique_tags = []
        for t in body.protected_tags:
            if t not in seen:
                unique_tags.append(t)
                seen.add(t)
        existing.protected_tags = unique_tags

    cfg.image_policies[image_name] = existing
    save_config(cfg)
    return existing


@router.delete("/{image_name:path}", status_code=204)
def delete_image_policy(image_name: str):
    cfg = get_current_config()
    if image_name not in cfg.image_policies:
        raise HTTPException(404, "Policy not found")
    del cfg.image_policies[image_name]
    save_config(cfg)
