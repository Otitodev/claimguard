"""Seed the database with a demo practice and a realistic denial history.

Usage:
    python -m backend.seed            # create tables + seed (skips if seeded)
    python -m backend.seed --reset    # drop all tables, recreate, reseed

Run from the repo root with the venv active and DATABASE_URL pointing at the
Docker Postgres from docker-compose.yml.
"""

import sys
from datetime import date, timedelta
from decimal import Decimal

from app.db import SessionLocal, engine, init_db
from app.models import (
    ActivityLog,
    Appeal,
    Base,
    Claim,
    Denial,
    DenialCode,
    Patient,
    Payer,
    Practice,
)

TODAY = date.today()

DENIAL_CODES = [
    ("CO-50", "Not deemed a medical necessity by the payer", "medical_necessity"),
    ("CO-167", "This diagnosis is not covered", "medical_necessity"),
    ("CO-11", "Diagnosis inconsistent with the procedure", "medical_necessity"),
    ("CO-151", "Information does not support this many/frequency of services", "medical_necessity"),
    ("CO-16", "Claim/service lacks information needed for adjudication", "missing_info"),
    ("CO-4", "Procedure code inconsistent with the modifier used", "missing_info"),
    ("CO-97", "Benefit already included in payment for another service", "missing_info"),
    ("CO-29", "The time limit for filing has expired", "timely_filing"),
    ("CO-27", "Expenses incurred after coverage terminated", "eligibility"),
    ("CO-22", "Care may be covered by another payer per coordination of benefits", "eligibility"),
    ("CO-109", "Claim not covered by this payer/contractor", "eligibility"),
    ("CO-18", "Exact duplicate claim/service", "duplicate"),
]

PAYERS = [
    ("Blue Cross Blue Shield", "commercial", 180),
    ("Aetna", "commercial", 180),
    ("UnitedHealthcare", "commercial", 180),
    ("Medicare", "medicare", 120),
    ("Medicaid", "medicaid", 90),
]

PATIENTS = [
    ("Maria Gonzalez", date(1972, 3, 14)),
    ("James Whitfield", date(1958, 11, 2)),
    ("Aisha Rahman", date(1990, 7, 21)),
    ("Robert Chen", date(1965, 1, 9)),
    ("Linda Park", date(1981, 5, 30)),
    ("David Okafor", date(1977, 9, 12)),
]


def already_seeded(session) -> bool:
    return session.query(Practice).count() > 0


def _claim(
    session,
    *,
    practice,
    patient,
    payer,
    dos_days_ago,
    cpt,
    icd,
    billed,
    status,
):
    claim = Claim(
        practice_id=practice.id,
        patient_id=patient.id,
        payer_id=payer.id,
        date_of_service=TODAY - timedelta(days=dos_days_ago),
        cpt_codes=cpt,
        icd_codes=icd,
        billed_amount=Decimal(str(billed)),
        status=status,
    )
    session.add(claim)
    session.flush()
    session.add(
        ActivityLog(claim_id=claim.id, action_type="uploaded", actor="user")
    )
    return claim


def _denial(
    session,
    *,
    claim,
    payer,
    code,
    denied,
    denial_days_ago,
    reason,
    classification,
):
    denial_date = TODAY - timedelta(days=denial_days_ago)
    denial = Denial(
        claim_id=claim.id,
        denial_code=code,
        denied_amount=Decimal(str(denied)),
        denial_date=denial_date,
        appeal_deadline=denial_date + timedelta(days=payer.appeal_window_days),
        ai_reason_summary=reason,
        ai_classification=classification,
    )
    session.add(denial)
    session.flush()
    session.add(
        ActivityLog(
            claim_id=claim.id,
            action_type="classified",
            actor="ai",
            details={"classification": classification},
        )
    )
    return denial


def seed(session) -> Practice:
    # denial_codes (idempotent upsert)
    for code, desc, category in DENIAL_CODES:
        if session.get(DenialCode, code) is None:
            session.add(DenialCode(code=code, description=desc, category=category))
    session.flush()

    practice = Practice(
        name="Riverside Family Medicine",
        plan="claimguard",
        phone="(217) 555-0142",
        fax="(217) 555-0143",
        address_line1="456 Oak Street, Suite 200",
        city="Springfield",
        state="IL",
        zip_code="62701",
        npi="1234567890",
        tax_id="12-3456789",
        primary_provider_name="Dr. Sarah Chen",
        primary_provider_credentials="MD",
        specialty="Family Medicine",
        default_appeal_tone="formal",
    )
    session.add(practice)
    session.flush()

    payers = {}
    for name, ptype, window in PAYERS:
        payer = Payer(name=name, payer_type=ptype, appeal_window_days=window)
        session.add(payer)
        session.flush()
        payers[name] = payer

    patients = {}
    for name, dob in PATIENTS:
        patient = Patient(practice_id=practice.id, name=name, dob=dob)
        session.add(patient)
        session.flush()
        patients[name] = patient

    bcbs = payers["Blue Cross Blue Shield"]
    aetna = payers["Aetna"]
    uhc = payers["UnitedHealthcare"]
    medicare = payers["Medicare"]

    # 1-2: clean paid claims (denominator for denial_rate)
    _claim(session, practice=practice, patient=patients["Maria Gonzalez"], payer=bcbs,
           dos_days_ago=70, cpt=["99213"], icd=["E11.9"], billed=180, status="paid")
    _claim(session, practice=practice, patient=patients["Robert Chen"], payer=medicare,
           dos_days_ago=64, cpt=["93000"], icd=["I10"], billed=95, status="paid")

    # 3: medical necessity -> appeal drafted, deadline within 7 days (needs-action)
    c3 = _claim(session, practice=practice, patient=patients["James Whitfield"], payer=bcbs,
                dos_days_ago=175, cpt=["70553"], icd=["G43.909"], billed=1450, status="appealed")
    d3 = _denial(session, claim=c3, payer=bcbs, code="CO-50", denied=1450, denial_days_ago=176,
                 reason="The payer says the MRI was not medically necessary for this headache diagnosis.",
                 classification="appeal")
    d3.appeal_deadline = TODAY + timedelta(days=5)
    session.add(Appeal(denial_id=d3.id, letter_text="(seeded draft appeal letter)", status="drafted"))
    session.add(ActivityLog(claim_id=c3.id, action_type="appeal_drafted", actor="ai"))

    # 4: timely filing -> write_off
    c4 = _claim(session, practice=practice, patient=patients["Aisha Rahman"], payer=aetna,
                dos_days_ago=240, cpt=["99214"], icd=["J45.909"], billed=220, status="written_off")
    _denial(session, claim=c4, payer=aetna, code="CO-29", denied=220, denial_days_ago=30,
            reason="The claim was submitted after the payer's filing deadline and cannot be recovered.",
            classification="write_off")

    # 5: missing info -> resubmit
    c5 = _claim(session, practice=practice, patient=patients["Linda Park"], payer=uhc,
                dos_days_ago=40, cpt=["99204"], icd=["M54.5"], billed=310, status="denied")
    _denial(session, claim=c5, payer=uhc, code="CO-16", denied=310, denial_days_ago=20,
            reason="The claim is missing required information and should be corrected and resubmitted.",
            classification="resubmit")

    # 6: medical necessity -> appeal submitted (awaiting response, within window)
    c6 = _claim(session, practice=practice, patient=patients["David Okafor"], payer=aetna,
                dos_days_ago=90, cpt=["72148"], icd=["M51.26"], billed=1200, status="appealed")
    d6 = _denial(session, claim=c6, payer=aetna, code="CO-167", denied=1200, denial_days_ago=45,
                 reason="The payer states the diagnosis is not covered for this lumbar MRI.",
                 classification="appeal")
    submitted_6 = TODAY - timedelta(days=10)
    a6 = Appeal(denial_id=d6.id, letter_text="(seeded appeal letter)", status="submitted",
                submitted_date=submitted_6,
                expected_response_date=submitted_6 + timedelta(days=45),
                status_updated_at=TODAY - timedelta(days=10))
    session.add(a6)
    session.add(ActivityLog(claim_id=c6.id, action_type="appeal_submitted", actor="user"))

    # 7: duplicate -> write_off
    c7 = _claim(session, practice=practice, patient=patients["Maria Gonzalez"], payer=uhc,
                dos_days_ago=55, cpt=["80053"], icd=["E78.5"], billed=85, status="written_off")
    _denial(session, claim=c7, payer=uhc, code="CO-18", denied=85, denial_days_ago=25,
            reason="This is an exact duplicate of a claim already paid.",
            classification="write_off")

    # 8: appeal WON -> revenue_recovered_this_month + claim resolved
    c8 = _claim(session, practice=practice, patient=patients["Robert Chen"], payer=bcbs,
                dos_days_ago=120, cpt=["43239"], icd=["K21.9"], billed=2100, status="resolved")
    d8 = _denial(session, claim=c8, payer=bcbs, code="CO-151", denied=2100, denial_days_ago=80,
                 reason="The payer questioned the frequency of services; medical necessity was documented.",
                 classification="appeal")
    submitted_8 = TODAY - timedelta(days=40)
    won_8 = TODAY.replace(day=min(TODAY.day, 15))
    session.add(Appeal(denial_id=d8.id, letter_text="(seeded won appeal)", status="won",
                        submitted_date=submitted_8,
                        outcome_date=won_8,
                        expected_response_date=submitted_8 + timedelta(days=45),
                        status_updated_at=won_8,
                        recovered_amount=Decimal("2100")))
    session.add(ActivityLog(claim_id=c8.id, action_type="appeal_won", actor="user"))

    # 9: eligibility -> resubmit
    c9 = _claim(session, practice=practice, patient=patients["Aisha Rahman"], payer=medicare,
                dos_days_ago=35, cpt=["99213"], icd=["I10"], billed=150, status="denied")
    _denial(session, claim=c9, payer=medicare, code="CO-22", denied=150, denial_days_ago=15,
            reason="Another payer may be primary; coordinate benefits and resubmit.",
            classification="resubmit")

    # 10: medical necessity -> appeal drafted, deadline within 7 days (needs-action)
    c10 = _claim(session, practice=practice, patient=patients["Linda Park"], payer=bcbs,
                 dos_days_ago=170, cpt=["64483"], icd=["M54.16"], billed=980, status="appealed")
    d10 = _denial(session, claim=c10, payer=bcbs, code="CO-11", denied=980, denial_days_ago=171,
                  reason="The payer says the diagnosis is inconsistent with the injection procedure.",
                  classification="appeal")
    d10.appeal_deadline = TODAY + timedelta(days=3)
    session.add(Appeal(denial_id=d10.id, letter_text="(seeded draft appeal letter)", status="drafted"))
    session.add(ActivityLog(claim_id=c10.id, action_type="appeal_drafted", actor="ai"))

    # 11: eligibility -> appeal lost
    c11 = _claim(session, practice=practice, patient=patients["David Okafor"], payer=uhc,
                 dos_days_ago=140, cpt=["99215"], icd=["E11.65"], billed=260, status="appealed")
    d11 = _denial(session, claim=c11, payer=uhc, code="CO-109", denied=260, denial_days_ago=70,
                  reason="The payer maintains the claim is not covered under this plan.",
                  classification="appeal")
    submitted_11 = TODAY - timedelta(days=50)
    lost_11 = TODAY - timedelta(days=20)
    session.add(Appeal(denial_id=d11.id, letter_text="(seeded lost appeal)", status="lost",
                        submitted_date=submitted_11,
                        outcome_date=lost_11,
                        expected_response_date=submitted_11 + timedelta(days=45),
                        status_updated_at=lost_11))
    session.add(ActivityLog(claim_id=c11.id, action_type="appeal_lost", actor="user"))

    # 12: clean paid claim
    _claim(session, practice=practice, patient=patients["James Whitfield"], payer=medicare,
           dos_days_ago=20, cpt=["99213"], icd=["I10"], billed=120, status="paid")

    # 13: recently submitted (within expected response window — not overdue)
    c13 = _claim(session, practice=practice, patient=patients["Maria Gonzalez"], payer=aetna,
                 dos_days_ago=80, cpt=["97110"], icd=["M25.561"], billed=320, status="appealed")
    d13 = _denial(session, claim=c13, payer=aetna, code="CO-50", denied=320, denial_days_ago=25,
                  reason="The payer deems therapeutic exercise not medically necessary for knee pain.",
                  classification="appeal")
    submitted_13 = TODAY - timedelta(days=3)
    session.add(Appeal(denial_id=d13.id, letter_text="(seeded appeal — recently submitted)", status="submitted",
                        submitted_date=submitted_13,
                        expected_response_date=submitted_13 + timedelta(days=45),
                        status_updated_at=submitted_13))
    session.add(ActivityLog(claim_id=c13.id, action_type="appeal_submitted", actor="user"))

    # 14: submitted 55 days ago — past 45-day response window (overdue, amber)
    c14 = _claim(session, practice=practice, patient=patients["Aisha Rahman"], payer=bcbs,
                 dos_days_ago=110, cpt=["20553"], icd=["M79.1"], billed=680, status="appealed")
    d14 = _denial(session, claim=c14, payer=bcbs, code="CO-167", denied=680, denial_days_ago=70,
                  reason="Trigger point injections not covered for myalgia without imaging.",
                  classification="appeal")
    submitted_14 = TODAY - timedelta(days=55)
    session.add(Appeal(denial_id=d14.id, letter_text="(seeded appeal — overdue 55 days)", status="submitted",
                        submitted_date=submitted_14,
                        expected_response_date=submitted_14 + timedelta(days=45),
                        status_updated_at=submitted_14))
    session.add(ActivityLog(claim_id=c14.id, action_type="appeal_submitted", actor="user"))

    # 15: submitted 92 days ago — past response window by a lot (overdue, red)
    c15 = _claim(session, practice=practice, patient=patients["Linda Park"], payer=uhc,
                 dos_days_ago=160, cpt=["99205"], icd=["R51"], billed=380, status="appealed")
    d15 = _denial(session, claim=c15, payer=uhc, code="CO-11", denied=380, denial_days_ago=110,
                  reason="Payer says headache diagnosis does not support level-5 new patient visit.",
                  classification="appeal")
    submitted_15 = TODAY - timedelta(days=92)
    session.add(Appeal(denial_id=d15.id, letter_text="(seeded appeal — overdue 92 days)", status="submitted",
                        submitted_date=submitted_15,
                        expected_response_date=submitted_15 + timedelta(days=45),
                        status_updated_at=submitted_15))
    session.add(ActivityLog(claim_id=c15.id, action_type="appeal_submitted", actor="user"))

    # 16: medical necessity -> drafted, deadline tomorrow (urgent in Drafts section)
    c16 = _claim(session, practice=practice, patient=patients["Robert Chen"], payer=medicare,
                 dos_days_ago=175, cpt=["72141"], icd=["M54.16"], billed=760, status="appealed")
    d16 = _denial(session, claim=c16, payer=medicare, code="CO-50", denied=760, denial_days_ago=176,
                  reason="MRI cervical spine not deemed medically necessary for thoracic radiculopathy.",
                  classification="appeal")
    d16.appeal_deadline = TODAY + timedelta(days=1)
    session.add(Appeal(denial_id=d16.id, letter_text="(seeded appeal — deadline tomorrow)", status="drafted"))
    session.add(ActivityLog(claim_id=c16.id, action_type="appeal_drafted", actor="ai"))

    session.commit()
    return practice


def main() -> None:
    reset = "--reset" in sys.argv
    if reset:
        Base.metadata.drop_all(engine)
    init_db()

    session = SessionLocal()
    try:
        if already_seeded(session) and not reset:
            practice = session.query(Practice).first()
            print(f"Already seeded. practice_id={practice.id}")
            return
        practice = seed(session)
        print(f"Seeded. practice_id={practice.id}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
