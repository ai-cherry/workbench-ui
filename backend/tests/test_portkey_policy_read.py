import os
import sys
from pathlib import Path
import yaml

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.portkey_agent import get_routing_policy


def test_routing_policy_read(tmp_path):
    # Write a temporary routing.yaml into agno/
    agno_dir = Path.cwd() / 'agno'
    agno_dir.mkdir(exist_ok=True)
    routing_path = agno_dir / 'routing.yaml'
    data = {
        'plan': { 'primary': '@anthropic/claude-3.7', 'fallbacks': ['@openai/gpt-4o-mini'], 'maxLatencyMs': 1500 },
        'code': { 'primary': '@deepseek/deepseek-coder' }
    }
    routing_path.write_text(yaml.safe_dump(data))

    policy = get_routing_policy()
    assert 'plan' in policy and policy['plan']['primary'] == '@anthropic/claude-3.7'
    assert 'code' in policy and policy['code']['primary'] == '@deepseek/deepseek-coder'

