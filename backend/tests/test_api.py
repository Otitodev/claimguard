import pytest
from fastapi.testclient import TestClient

import app.pipeline.graph as graph_module
from app.db import SessionLocal
from app.main import app
from app.models import Practice


@pytest.fixture
def client(fake_llm, monkeypatch):
    # run_pipeline falls back to get_chat_model() when llm is None; point it at
    # the fake so the upload endpoint runs without a real key.
    monkeypatch.setattr(graph_module, "get_chat_model", lambda: fake_llm)
    return TestClient(app)


@pytest.fixture
def practice_id():
    s = SessionLocal()
    try:
        p = Practice(name="API Test Practice")
        s.add(p)
        s.commit()
        return str(p.id)
    finally:
        s.close()


def test_upload_and_reads(client, practice_id):
    files = {"file": ("eob.pdf", b"%PDF-1.4 fake", "application/pdf")}
    r = client.post(
        "/claims/upload", data={"practice_id": practice_id}, files=files
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["result"]["classification"] == "appeal"
    claim_id = body["result"]["claim_id"]

    r_detail = client.get(f"/claims/{claim_id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert detail["denials"][0]["ai_classification"] == "appeal"
    assert len(detail["appeals"]) == 1

    r_list = client.get("/claims", params={"practice_id": practice_id})
    assert r_list.status_code == 200
    assert any(c["id"] == claim_id for c in r_list.json())

    r_sum = client.get("/analytics/summary", params={"practice_id": practice_id})
    assert r_sum.status_code == 200
    assert r_sum.json()["total_claims"] >= 1

    r_na = client.get(
        "/denials/needs-action", params={"practice_id": practice_id}
    )
    assert r_na.status_code == 200


def test_upload_unknown_practice(client):
    files = {"file": ("eob.pdf", b"%PDF-1.4 fake", "application/pdf")}
    r = client.post(
        "/claims/upload",
        data={"practice_id": "00000000-0000-0000-0000-000000000000"},
        files=files,
    )
    assert r.status_code == 404
