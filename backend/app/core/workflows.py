"""Helpers for working with Agno workflow definitions."""
from __future__ import annotations

from typing import Any, Dict

import yaml

from .config import PROJECT_ROOT

WORKFLOW_PATH = PROJECT_ROOT / "agno" / "config.yaml"


def load_workflows() -> Dict[str, Any]:
    """Load workflow definitions from the Agno configuration."""

    if not WORKFLOW_PATH.exists():
        return {}
    try:
        with WORKFLOW_PATH.open("r", encoding="utf-8") as handle:
            config = yaml.safe_load(handle) or {}
    except Exception:
        return {}
    return config.get("workflows") or {}


def workflow_summary() -> Dict[str, Any]:
    """Return a summary payload used by the workflow listing endpoint."""

    payload = {"workflows": []}
    for name, wf in load_workflows().items():
        payload["workflows"].append(
            {
                "name": name,
                "description": wf.get("description", ""),
                "steps": len(wf.get("steps") or []),
            }
        )
    return payload


__all__ = ["load_workflows", "workflow_summary"]
