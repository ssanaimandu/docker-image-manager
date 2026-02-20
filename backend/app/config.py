"""Configuration manager – loads/saves JSON config, respects env vars."""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path

from app.models import AppConfig

_DEFAULT_CONFIG_PATH = "/app/config/config.json"
_DEFAULT_WEB_PORT = 8080
_DEFAULT_LOG_LEVEL = "INFO"

_lock = threading.Lock()
_config: AppConfig | None = None


def get_config_path() -> Path:
    return Path(os.environ.get("DIM_CONFIG_PATH", _DEFAULT_CONFIG_PATH))


def get_web_port() -> int:
    try:
        return int(os.environ.get("DIM_WEB_PORT", str(_DEFAULT_WEB_PORT)))
    except ValueError:
        return _DEFAULT_WEB_PORT


def get_log_level() -> str:
    return os.environ.get("DIM_LOG_LEVEL", _DEFAULT_LOG_LEVEL)


def load_config() -> AppConfig:
    """Load config from JSON file.  Creates default if missing."""
    global _config
    path = get_config_path()
    with _lock:
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                _config = AppConfig(**data)
            except Exception:
                _config = AppConfig()
        else:
            _config = AppConfig()
            save_config(_config)
        return _config


def save_config(cfg: AppConfig) -> None:
    """Persist config to JSON file."""
    global _config
    path = get_config_path()
    with _lock:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(cfg.model_dump(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        _config = cfg


def get_current_config() -> AppConfig:
    """Return in-memory config, loading if necessary."""
    global _config
    if _config is None:
        return load_config()
    return _config
