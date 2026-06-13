"""Generate synthetic EOB / denial-letter PDFs for demos and tests.

    python -m backend.scripts.generate_sample_eobs

Writes a few PDFs into backend/samples/. All data is fabricated — no real PHI.
"""

import os
from datetime import date, timedelta

from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "samples")

TODAY = date.today()


SAMPLES = [
    {
        "filename": "appeal_eob.pdf",
        "payer": "Blue Cross Blue Shield",
        "patient": "Eleanor Hart",
        "dob": "1968-04-22",
        "dos": (TODAY - timedelta(days=30)).isoformat(),
        "claim_no": "BCBS-2024-558102",
        "cpt": "70553",
        "icd": "G43.909",
        "billed": "1,450.00",
        "denied": "1,450.00",
        "carc": "CO-50",
        "carc_text": "These are non-covered services because this is not deemed a "
        "'medical necessity' by the payer.",
        "denial_date": (TODAY - timedelta(days=12)).isoformat(),
    },
    {
        "filename": "writeoff_eob.pdf",
        "payer": "Aetna",
        "patient": "Marcus Bell",
        "dob": "1955-12-03",
        "dos": (TODAY - timedelta(days=260)).isoformat(),
        "claim_no": "AET-2023-770431",
        "cpt": "99214",
        "icd": "J45.909",
        "billed": "220.00",
        "denied": "220.00",
        "carc": "CO-29",
        "carc_text": "The time limit for filing this claim has expired.",
        "denial_date": (TODAY - timedelta(days=20)).isoformat(),
    },
    {
        "filename": "resubmit_eob.pdf",
        "payer": "UnitedHealthcare",
        "patient": "Priya Nair",
        "dob": "1989-08-17",
        "dos": (TODAY - timedelta(days=40)).isoformat(),
        "claim_no": "UHC-2024-201885",
        "cpt": "99204",
        "icd": "M54.5",
        "billed": "310.00",
        "denied": "310.00",
        "carc": "CO-16",
        "carc_text": "Claim/service lacks information or has submission/billing "
        "error(s) needed for adjudication.",
        "denial_date": (TODAY - timedelta(days=18)).isoformat(),
    },
]


def _draw(c: canvas.Canvas, s: dict) -> None:
    _width, height = LETTER
    y = height - 72

    def line(text: str, size: int = 11, dy: int = 18, bold: bool = False) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawString(72, y, text)
        y -= dy

    line(s["payer"], size=16, dy=26, bold=True)
    line("EXPLANATION OF BENEFITS — CLAIM DENIAL NOTICE", size=12, dy=28, bold=True)

    line(f"Date: {s['denial_date']}")
    line(f"Claim Number: {s['claim_no']}")
    line("")
    line("Patient Information", bold=True)
    line(f"Patient Name: {s['patient']}")
    line(f"Date of Birth: {s['dob']}")
    line("")
    line("Service Detail", bold=True)
    line(f"Date of Service: {s['dos']}")
    line(f"Procedure (CPT): {s['cpt']}")
    line(f"Diagnosis (ICD-10): {s['icd']}")
    line(f"Amount Billed: ${s['billed']}")
    line(f"Amount Denied: ${s['denied']}")
    line("")
    line("Denial / Adjustment", bold=True)
    line(f"Reason Code (CARC): {s['carc']}")
    # wrap the reason text
    c.setFont("Helvetica", 11)
    words = s["carc_text"].split()
    cur = ""
    for w in words:
        if len(cur) + len(w) + 1 > 80:
            c.drawString(72, y, cur)
            y -= 16
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        c.drawString(72, y, cur)
        y -= 24
    line("")
    line(
        "If you believe this determination is in error, you may submit an appeal",
        size=10,
        dy=14,
    )
    line(
        "in writing within the timeframe specified in your provider agreement.",
        size=10,
    )


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for s in SAMPLES:
        path = os.path.join(OUT_DIR, s["filename"])
        c = canvas.Canvas(path, pagesize=LETTER)
        _draw(c, s)
        c.showPage()
        c.save()
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
