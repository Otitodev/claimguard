from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models import Lead

client = TestClient(app)


def test_create_lead_persists():
    r = client.post(
        "/leads",
        json={"email": "biller@northside.com", "practice_name": "Northside Family Care"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "biller@northside.com"
    assert body["practice_name"] == "Northside Family Care"
    assert body["id"] and body["created_at"]

    s = SessionLocal()
    try:
        assert (
            s.query(Lead).filter(Lead.email == "biller@northside.com").count() >= 1
        )
    finally:
        s.close()


def test_create_lead_rejects_bad_email():
    r = client.post("/leads", json={"email": "not-an-email"})
    assert r.status_code == 422


def test_create_lead_blank_practice_becomes_null():
    r = client.post("/leads", json={"email": "solo@clinic.io", "practice_name": "   "})
    assert r.status_code == 201
    assert r.json()["practice_name"] is None
