"""Shared test fixtures.

Tests run against the Docker Postgres (PG-specific column types: UUID, ARRAY,
JSONB). Start it with `docker compose up -d` and point DATABASE_URL at it before
running pytest. A fake chat model stands in for the LLM so the pipeline and API
run without a real key.
"""

import os

# Pin tests to the local Docker Postgres even when .env points the app at Aurora
# (DB_IAM_AUTH=true). Env vars override .env in pydantic-settings, and this must
# run before app.config/app.db are imported below (the engine is built at import).
os.environ["DB_IAM_AUTH"] = "false"

from datetime import date  # noqa: E402

import pytest  # noqa: E402

from app.db import SessionLocal, init_db  # noqa: E402
from app.models import Practice  # noqa: E402
from app.schemas import DenialClassification, ExtractedEOB  # noqa: E402


class _Structured:
    def __init__(self, value):
        self._value = value

    def invoke(self, _messages):
        return self._value


class FakeChatModel:
    """Stands in for a LangChain chat model in tests."""

    def __init__(self, extracted: ExtractedEOB, classification: DenialClassification,
                 letter: str = "Dear Reviewer,\n\nWe respectfully appeal...\n\nSincerely,"):
        self._extracted = extracted
        self._classification = classification
        self._letter = letter

    def with_structured_output(self, schema):
        if schema is ExtractedEOB:
            return _Structured(self._extracted)
        if schema is DenialClassification:
            return _Structured(self._classification)
        raise ValueError(f"unexpected schema: {schema}")

    def invoke(self, _messages):
        class _R:
            content = self._letter

        return _R()


@pytest.fixture(scope="session", autouse=True)
def _create_tables():
    init_db()


@pytest.fixture
def session():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.rollback()
        s.close()


@pytest.fixture
def practice(session):
    p = Practice(name="Test Practice")
    session.add(p)
    session.flush()
    return p


@pytest.fixture
def fake_llm():
    extracted = ExtractedEOB(
        patient_name="Test Patient",
        payer_name="Test Payer",
        date_of_service=date(2024, 1, 15),
        cpt_codes=["70553"],
        icd_codes=["G43.909"],
        billed_amount=1450,
        denied_amount=1450,
        denial_codes=["CO-50"],
        denial_date=date(2024, 1, 20),
    )
    classification = DenialClassification(
        reason_summary="Denied as not medically necessary.",
        classification="appeal",
        appeal_angle="The MRI was warranted given the chronic migraine diagnosis.",
    )
    return FakeChatModel(extracted, classification)
