import os
import sys
from pathlib import Path

# Ensure backend package root is importable
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("TESTING", "true")

from starlette.testclient import TestClient

from app.main import app, create_access_token, ADMIN_USERNAME


def auth_headers():
    token = create_access_token({"sub": ADMIN_USERNAME})
    return {"Authorization": f"Bearer {token}"}


def test_health_check_fast():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "timestamp" in data
    assert "services" in data
    # Should have known services keys
    assert any(k in data["services"] for k in ("memory", "filesystem", "git", "vector"))


def test_proxy_invalid_paths_rejected():
    client = TestClient(app)
    # URL scheme injection blocked
    r1 = client.get("/mcp/memory/http://evil", headers=auth_headers())
    assert r1.status_code == 400
    # Traversal blocked
    r2 = client.get("/mcp/memory/../secret", headers=auth_headers())
    assert r2.status_code == 400
