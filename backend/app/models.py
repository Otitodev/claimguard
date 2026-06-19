"""SQLAlchemy ORM models mirroring schema.sql (TRD §4).

Kept in sync with ``backend/schema.sql`` (the canonical DDL for Aurora). For
local dev, ``db.init_db()`` creates these tables directly via ``create_all``.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Practice(Base):
    __tablename__ = "practices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    # Better Auth user id (JWT `sub`) that owns this practice. One practice per
    # user; the API derives the practice from the authenticated user via this.
    owner_user_id: Mapped[str | None] = mapped_column(Text, unique=True)
    # AgentMail email-in mapping (TRD §5): the dedicated inbox for this practice.
    # The webhook derives practice_id from message.inbox_id via this column.
    agentmail_inbox_id: Mapped[str | None] = mapped_column(Text, unique=True)
    agentmail_address: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Payer(Base):
    __tablename__ = "payers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    payer_type: Mapped[str | None] = mapped_column(Text)
    # Drives appeal_deadline = denial_date + appeal_window_days (TRD §4/§6).
    appeal_window_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=180
    )


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (
        UniqueConstraint("practice_id", "name", "dob", name="uq_patient_identity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    practice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("practices.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    dob: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    practice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("practices.id"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id"), nullable=False
    )
    payer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payers.id"), nullable=False
    )
    date_of_service: Mapped[date | None] = mapped_column(Date)
    cpt_codes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    icd_codes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    billed_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    # submitted | paid | partially_paid | denied | appealed | resolved | written_off
    status: Mapped[str] = mapped_column(Text, nullable=False, default="submitted")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    patient: Mapped[Patient] = relationship()
    payer: Mapped[Payer] = relationship()
    practice: Mapped[Practice] = relationship()
    denials: Mapped[list["Denial"]] = relationship(
        back_populates="claim", cascade="all, delete-orphan"
    )
    activity: Mapped[list["ActivityLog"]] = relationship(
        back_populates="claim", cascade="all, delete-orphan"
    )


class DenialCode(Base):
    __tablename__ = "denial_codes"

    code: Mapped[str] = mapped_column(Text, primary_key=True)
    description: Mapped[str | None] = mapped_column(Text)
    # medical_necessity | missing_info | timely_filing | eligibility | duplicate
    category: Mapped[str | None] = mapped_column(Text)


class Denial(Base):
    __tablename__ = "denials"
    __table_args__ = (
        # DB-level idempotency guard (TRD §4): one denial per claim+code+date.
        UniqueConstraint(
            "claim_id", "denial_code", "denial_date", name="uq_denial_identity"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    claim_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("claims.id"), nullable=False
    )
    denial_code: Mapped[str | None] = mapped_column(ForeignKey("denial_codes.code"))
    denied_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    denial_date: Mapped[date | None] = mapped_column(Date)
    appeal_deadline: Mapped[date | None] = mapped_column(Date)
    ai_reason_summary: Mapped[str | None] = mapped_column(Text)
    # resubmit | appeal | write_off
    ai_classification: Mapped[str | None] = mapped_column(Text)
    source_document_url: Mapped[str | None] = mapped_column(Text)
    raw_extracted_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    claim: Mapped[Claim] = relationship(back_populates="denials")
    code: Mapped[DenialCode | None] = relationship()
    appeals: Mapped[list["Appeal"]] = relationship(
        back_populates="denial", cascade="all, delete-orphan"
    )


# Days after submission a payer is expected to respond. Used to compute
# Appeal.expected_response_date and as the fallback for appeals submitted before
# that column existed (see api/denials.py needs-action queue).
APPEAL_RESPONSE_WINDOW_DAYS = 45


class Appeal(Base):
    __tablename__ = "appeals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    denial_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("denials.id"), nullable=False
    )
    letter_text: Mapped[str | None] = mapped_column(Text)
    # drafted | submitted | won | lost | pending
    status: Mapped[str] = mapped_column(Text, nullable=False, default="drafted")
    submitted_date: Mapped[date | None] = mapped_column(Date)
    outcome_date: Mapped[date | None] = mapped_column(Date)
    recovered_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    # When the payer is expected to respond (submitted_date + response_window).
    # Defaults to 45 days for commercial payers; configurable per-payer later.
    expected_response_date: Mapped[date | None] = mapped_column(Date)
    status_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    denial: Mapped[Denial] = relationship(back_populates="appeals")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    claim_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("claims.id"))
    # uploaded | parsed | classified | appeal_drafted | appeal_submitted
    #   | appeal_won | appeal_lost | status_changed
    action_type: Mapped[str] = mapped_column(Text, nullable=False)
    actor: Mapped[str] = mapped_column(Text, nullable=False, default="ai")
    details: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    claim: Mapped[Claim] = relationship(back_populates="activity")


class Lead(Base):
    """A demo / waitlist request captured from the marketing landing page."""

    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(Text, nullable=False)
    practice_name: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="landing")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
