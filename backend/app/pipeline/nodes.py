"""LangGraph node factories (TRD §6).

Each ``make_*`` returns a node callable bound to the request-scoped session and
the configured/injected chat model, so the graph stays free of global state and
tests can pass a fake model.
"""

from datetime import timedelta
from decimal import Decimal

from ..llm.classify import classify_denial
from ..llm.draft import draft_appeal
from ..llm.extract import extract_eob, pdf_to_text
from ..models import Appeal, Claim, Denial
from ..services.persistence import (
    ensure_denial_code,
    find_existing_denial,
    get_category,
    log_activity,
    match_or_create_claim,
    match_or_create_patient,
    match_or_create_payer,
    select_primary_code,
)


def _to_decimal(value) -> Decimal | None:
    return Decimal(str(value)) if value is not None else None


def _result(state, denial, classification, letter, already_existed) -> dict:
    return {
        "claim_id": str(state["claim_id"]),
        "denial_id": str(denial.id),
        "classification": classification.classification,
        "reason_summary": classification.reason_summary,
        "appeal_drafted": bool(letter) and classification.classification == "appeal",
        "already_existed": already_existed,
    }


def make_parse_eob(session, llm):
    def parse_eob(state):
        pdf = state["pdf_bytes"]
        return {"raw_text": pdf_to_text(pdf), "extracted": extract_eob(llm, pdf)}

    return parse_eob


def make_resolve(session, llm):
    def resolve_patient_and_payer(state):
        ex = state["extracted"]
        patient = match_or_create_patient(
            session, state["practice_id"], ex.patient_name, None
        )
        payer = match_or_create_payer(session, ex.payer_name)
        return {
            "patient_id": patient.id,
            "payer_id": payer.id,
            "payer_name": payer.name,
            "appeal_window_days": payer.appeal_window_days,
        }

    return resolve_patient_and_payer


def make_match_claim(session, llm):
    def match_or_create_claim_node(state):
        ex = state["extracted"]
        claim = match_or_create_claim(
            session,
            practice_id=state["practice_id"],
            patient_id=state["patient_id"],
            payer_id=state["payer_id"],
            date_of_service=ex.date_of_service,
            cpt_codes=ex.cpt_codes,
            icd_codes=ex.icd_codes,
            billed_amount=ex.billed_amount,
        )
        return {"claim_id": claim.id}

    return match_or_create_claim_node


def make_classify(session, llm):
    def classify_denial_node(state):
        ex = state["extracted"]
        primary = select_primary_code(session, ex.denial_codes)
        category = get_category(session, primary)
        claim = session.get(Claim, state["claim_id"])
        result = classify_denial(
            llm,
            denial_code=primary,
            category=category,
            cpt_codes=ex.cpt_codes,
            icd_codes=ex.icd_codes,
            billed_amount=claim.billed_amount,
            denied_amount=_to_decimal(ex.denied_amount),
            payer_name=state.get("payer_name"),
        )
        deadline = None
        if ex.denial_date is not None:
            deadline = ex.denial_date + timedelta(days=state["appeal_window_days"])
        return {
            "primary_denial_code": primary,
            "denial_category": category,
            "classification": result,
            "appeal_deadline": deadline,
        }

    return classify_denial_node


def route_after_classify(state) -> str:
    return (
        "draft_appeal"
        if state["classification"].classification == "appeal"
        else "persist"
    )


def make_draft(session, llm):
    def draft_appeal_node(state):
        ex = state["extracted"]
        cls = state["classification"]
        claim = session.get(Claim, state["claim_id"])
        letter = draft_appeal(
            llm,
            patient_name=ex.patient_name,
            date_of_service=ex.date_of_service,
            cpt_codes=ex.cpt_codes,
            icd_codes=ex.icd_codes,
            billed_amount=claim.billed_amount,
            denial_code=state.get("primary_denial_code"),
            reason_summary=cls.reason_summary,
            appeal_angle=cls.appeal_angle,
            payer_name=state.get("payer_name"),
        )
        return {"appeal_letter": letter}

    return draft_appeal_node


def make_persist(session, llm):
    def persist(state):
        ex = state["extracted"]
        cls = state["classification"]
        claim_id = state["claim_id"]
        code = state.get("primary_denial_code")
        denial_date = ex.denial_date
        letter = state.get("appeal_letter")

        existing = find_existing_denial(session, claim_id, code, denial_date)
        if existing is not None:
            log_activity(
                session, claim_id, "uploaded", actor="user", details={"idempotent": True}
            )
            return {
                "denial_id": existing.id,
                "already_existed": True,
                "result": _result(state, existing, cls, letter, True),
            }

        ensure_denial_code(session, code)
        denial = Denial(
            claim_id=claim_id,
            denial_code=code,
            denied_amount=_to_decimal(ex.denied_amount),
            denial_date=denial_date,
            appeal_deadline=state.get("appeal_deadline"),
            ai_reason_summary=cls.reason_summary,
            ai_classification=cls.classification,
            source_document_url=state.get("source_document_url"),
            raw_extracted_text=state.get("raw_text"),
        )
        session.add(denial)
        session.flush()

        appeal = None
        if cls.classification == "appeal" and letter:
            appeal = Appeal(denial_id=denial.id, letter_text=letter, status="drafted")
            session.add(appeal)
            session.flush()

        claim = session.get(Claim, claim_id)
        if appeal:
            claim.status = "appealed"
        elif cls.classification == "write_off":
            claim.status = "written_off"
        else:  # resubmit (or appeal with no letter)
            claim.status = "denied"

        log_activity(session, claim_id, "uploaded", actor="user")
        log_activity(
            session,
            claim_id,
            "parsed",
            actor="ai",
            details={"patient": ex.patient_name, "denial_codes": ex.denial_codes},
        )
        log_activity(
            session,
            claim_id,
            "classified",
            actor="ai",
            details={"classification": cls.classification},
        )
        if appeal:
            log_activity(session, claim_id, "appeal_drafted", actor="ai")

        return {
            "denial_id": denial.id,
            "already_existed": False,
            "result": _result(state, denial, cls, letter, False),
        }

    return persist
