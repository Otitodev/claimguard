from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.pipeline.graph as graph_module
from app.auth import get_current_practice
from app.db import SessionLocal
from app.main import app
from app.models import Practice


@pytest.fixture
def auth_practice():
    """Create a practice and impersonate it by overriding the auth dependency,
    so the endpoints run as if a signed-in user owned it (no real JWT needed)."""
    s = SessionLocal()
    try:
        p = Practice(name="API Test Practice")
        s.add(p)
        s.commit()
        s.refresh(p)  # load server-default columns (e.g. plan)
        # Snapshot every column so the detached holder satisfies the
        # /me/practice serializer (which reads all profile fields).
        holder = SimpleNamespace(
            **{c.name: getattr(p, c.name) for c in Practice.__table__.columns}
        )
    finally:
        s.close()
    return holder


@pytest.fixture
def client(fake_llm, monkeypatch, auth_practice):
    # run_pipeline falls back to get_chat_model() when llm is None; point it at
    # the fake so the upload endpoint runs without a real key. Accept the
    # optional model arg (the critique pass requests the fast model).
    monkeypatch.setattr(graph_module, "get_chat_model", lambda *a, **k: fake_llm)
    app.dependency_overrides[get_current_practice] = lambda: auth_practice
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_practice, None)


def test_upload_and_reads(client, auth_practice):
    files = {"file": ("eob.pdf", b"%PDF-1.4 fake", "application/pdf")}
    r = client.post("/claims/upload", files=files)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["result"]["classification"] == "appeal"
    claim_id = body["result"]["claim_id"]

    r_detail = client.get(f"/claims/{claim_id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert detail["denials"][0]["ai_classification"] == "appeal"
    assert len(detail["appeals"]) == 1

    r_list = client.get("/claims")
    assert r_list.status_code == 200
    assert any(c["id"] == claim_id for c in r_list.json())

    r_sum = client.get("/analytics/summary")
    assert r_sum.status_code == 200
    assert r_sum.json()["total_claims"] >= 1

    r_na = client.get("/denials/needs-action")
    assert r_na.status_code == 200

    r_me = client.get("/me/practice")
    assert r_me.status_code == 200
    assert r_me.json()["id"] == str(auth_practice.id)


def test_upload_empty_file(client):
    files = {"file": ("eob.pdf", b"", "application/pdf")}
    r = client.post("/claims/upload", files=files)
    assert r.status_code == 400


def test_requires_auth_without_override():
    """Endpoints reject requests with no Bearer token (real dependency)."""
    with TestClient(app) as c:
        assert c.get("/analytics/summary").status_code == 401
        assert c.get("/claims").status_code == 401
