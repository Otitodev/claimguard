import uuid

import pytest
from fastapi.testclient import TestClient

import app.pipeline.graph as graph_module
import app.services.agentmail_client as agentmail_client
from app.db import SessionLocal, init_db
from app.main import app
from app.models import Claim, Practice

SAMPLE_PDF = b"%PDF-1.4 fake eob"


@pytest.fixture
def inbox_practice():
    init_db()  # ensures the agentmail_* columns exist
    s = SessionLocal()
    try:
        p = Practice(
            name="Webhook Practice",
            agentmail_inbox_id=f"inbox_{uuid.uuid4().hex[:10]}",
        )
        s.add(p)
        s.commit()
        return str(p.id), p.agentmail_inbox_id
    finally:
        s.close()


@pytest.fixture
def client(fake_llm, monkeypatch):
    # No real LLM / no real AgentMail: fake the model and the attachment fetch.
    monkeypatch.setattr(graph_module, "get_chat_model", lambda model=None: fake_llm)
    monkeypatch.setattr(
        agentmail_client, "download_attachment", lambda *a, **k: SAMPLE_PDF
    )
    return TestClient(app)


def _payload(inbox_id: str, *, with_pdf: bool = True) -> dict:
    attachments = (
        [
            {
                "attachment_id": "att_1",
                "filename": "eob.pdf",
                "content_type": "application/pdf",
                "inline": False,
            }
        ]
        if with_pdf
        else []
    )
    return {
        "event_type": "message.received",
        "event_id": "evt_1",
        "message": {
            "inbox_id": inbox_id,
            "message_id": "<m1@agentmail.to>",
            "attachments": attachments,
        },
    }


def test_webhook_runs_pipeline(client, inbox_practice):
    practice_id, inbox_id = inbox_practice
    r = client.post("/webhooks/agentmail", json=_payload(inbox_id))
    assert r.status_code == 202
    assert r.json()["pdf_attachments"] == 1

    # TestClient runs background tasks synchronously, so the claim exists now.
    s = SessionLocal()
    try:
        claims = (
            s.query(Claim).filter(Claim.practice_id == uuid.UUID(practice_id)).all()
        )
        assert len(claims) == 1
        assert claims[0].denials[0].ai_classification == "appeal"
        # Emailed-in denials are tagged with the 'email' intake source.
        assert claims[0].denials[0].source == "email"
    finally:
        s.close()


def test_webhook_unknown_inbox(client):
    r = client.post(
        "/webhooks/agentmail", json=_payload("inbox_does_not_exist")
    )
    assert r.status_code == 202
    assert r.json()["status"] == "ignored"


def test_webhook_ignores_non_received_events(client):
    r = client.post(
        "/webhooks/agentmail",
        json={"event_type": "message.sent", "message": {}},
    )
    assert r.status_code == 202
    assert r.json()["status"] == "ignored"
