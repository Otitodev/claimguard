"""Tests for the appeal redraft endpoint (POST /appeals/{id}/redraft)."""

import uuid

import pytest
from fastapi.testclient import TestClient

import app.api.appeals as appeals_module
from app.auth import get_current_practice
from app.db import SessionLocal, get_session
from app.main import app
from app.models import Appeal, Claim
from app.pipeline.graph import run_pipeline


@pytest.fixture
def drafted_appeal(session, practice, fake_llm):
    """Run the pipeline once (commits) to produce a drafted appeal."""
    result = run_pipeline(
        session, practice_id=practice.id, pdf_bytes=b"%PDF-1.4 x", llm=fake_llm
    )
    claim = session.get(Claim, uuid.UUID(result["claim_id"]))
    appeal = claim.denials[0].appeals[0]
    return practice, appeal


@pytest.fixture
def api(fake_llm, monkeypatch):
    # No real LLM, no real auth: fake the model and the test session/practice.
    monkeypatch.setattr(appeals_module, "get_chat_model", lambda model=None: fake_llm)

    def _test_session():
        s = SessionLocal()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_session] = _test_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_redraft_returns_letter_without_persisting(api, drafted_appeal):
    practice, appeal = drafted_appeal
    original = appeal.letter_text
    app.dependency_overrides[get_current_practice] = lambda: practice

    r = api.post(
        f"/appeals/{appeal.id}/redraft",
        json={"instruction": "make it more assertive"},
    )
    assert r.status_code == 200
    assert r.json()["letter_text"]

    # Not persisted: the stored letter is unchanged until the client saves.
    s = SessionLocal()
    try:
        assert s.get(Appeal, appeal.id).letter_text == original
    finally:
        s.close()


def test_redraft_rejects_closed_appeal(api, drafted_appeal):
    practice, appeal = drafted_appeal
    app.dependency_overrides[get_current_practice] = lambda: practice

    s = SessionLocal()
    try:
        s.get(Appeal, appeal.id).status = "won"
        s.commit()
    finally:
        s.close()

    r = api.post(f"/appeals/{appeal.id}/redraft", json={})
    assert r.status_code == 409


def test_redraft_wrong_practice_404(api, drafted_appeal):
    _, appeal = drafted_appeal
    other = type("P", (), {"id": uuid.uuid4(), "default_appeal_tone": "formal", "specialty": None})
    app.dependency_overrides[get_current_practice] = lambda: other()

    r = api.post(f"/appeals/{appeal.id}/redraft", json={})
    assert r.status_code == 404
