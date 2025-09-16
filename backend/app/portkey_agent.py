"""
Optional Portkey-routed agent utilities (feature-flagged)

Provides helpers to construct a model via Portkey using OpenAILike without
impacting existing agents, plus an optional routing policy loaded from
`agno/routing.yaml`.
"""

import os
from typing import Any, Dict
import yaml

from agno.models.openai import OpenAIChat

try:  # Available in Agno for OpenAI-compatible providers (Portkey)
    from agno.models.openai.like import OpenAILike  # type: ignore
except Exception:  # pragma: no cover
    OpenAILike = None  # type: ignore


def _load_routing_policy() -> Dict[str, Any]:
    """Load optional routing policy from agno/routing.yaml.
    Example structure:
      plan:
        primary: "@anthropic/claude-3.7"
        fallbacks: ["@openai/gpt-4o-mini"]
        maxLatencyMs: 2000
      code:
        primary: "@deepseek/deepseek-coder"
    """
    try:
        path = os.path.join(os.getcwd(), 'agno', 'routing.yaml')
        if not os.path.exists(path):
            return {}
        with open(path, 'r') as f:
            data = yaml.safe_load(f) or {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def get_model_for_task(task: str) -> Any:
    """Return an Agno model, Portkey-routed if enabled and available.

    Falls back to OpenAIChat when Portkey is disabled or unavailable.
    """
    enable_portkey = os.getenv("ENABLE_PORTKEY", "false").lower() in ("1", "true", "yes")
    if not enable_portkey or OpenAILike is None:
        return OpenAIChat(id="gpt-4o-mini")

    api_key = os.getenv("PORTKEY_API_KEY")
    base_url = os.getenv("PORTKEY_BASE_URL", "https://api.portkey.ai/v1")
    if not api_key:
        return OpenAIChat(id="gpt-4o-mini")

    # Policy-driven routing if available
    policy = _load_routing_policy()
    entry = policy.get(task.lower()) if isinstance(policy, dict) else None
    if isinstance(entry, dict) and entry.get('primary'):
        model_id = entry['primary']
    else:
        # Default simple routing
        if task.lower() in ("plan", "review"):
            model_id = "@anthropic/claude-3.7"
        elif task.lower() in ("code", "fix", "refactor"):
            model_id = "@deepseek/deepseek-coder"
        else:
            model_id = "@openai/gpt-4o-mini"

    return OpenAILike(id=model_id, api_key=api_key, base_url=base_url)


def get_routing_policy() -> Dict[str, Any]:  # exported for tests
    return _load_routing_policy()

