from datetime import date

from app.services.persistence import (
    find_existing_denial,
    match_or_create_claim,
    match_or_create_patient,
    match_or_create_payer,
)


def test_patient_idempotent_with_dob(session, practice):
    p1 = match_or_create_patient(session, practice.id, "Jane Doe", date(1990, 1, 1))
    p2 = match_or_create_patient(session, practice.id, "Jane Doe", date(1990, 1, 1))
    assert p1.id == p2.id


def test_patient_idempotent_null_dob(session, practice):
    p1 = match_or_create_patient(session, practice.id, "No Dob", None)
    p2 = match_or_create_patient(session, practice.id, "No Dob", None)
    assert p1.id == p2.id  # NULL == NULL handled


def test_payer_idempotent(session):
    a = match_or_create_payer(session, "Idempotent Payer Co")
    b = match_or_create_payer(session, "Idempotent Payer Co")
    assert a.id == b.id


def test_claim_match_and_denial_guard(session, practice):
    patient = match_or_create_patient(session, practice.id, "Sam Lee", None)
    payer = match_or_create_payer(session, "Guard Payer")
    dos = date(2024, 2, 1)

    c1 = match_or_create_claim(
        session,
        practice_id=practice.id,
        patient_id=patient.id,
        payer_id=payer.id,
        date_of_service=dos,
        cpt_codes=["99213"],
        icd_codes=["I10"],
        billed_amount=150,
    )
    c2 = match_or_create_claim(
        session,
        practice_id=practice.id,
        patient_id=patient.id,
        payer_id=payer.id,
        date_of_service=dos,
        cpt_codes=["99213"],
        icd_codes=["I10"],
        billed_amount=150,
    )
    assert c1.id == c2.id  # same claim matched, not duplicated

    assert find_existing_denial(session, c1.id, "CO-50", date(2024, 2, 5)) is None
