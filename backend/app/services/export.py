"""Export appeal letters as PDF or DOC."""

import io
import re
from datetime import date
from html import unescape
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

from ..models import Appeal


def _strip_html(text: str) -> str:
    """Flatten the editor's HTML to newline-delimited plain text.

    The rich editor stores block elements with no literal newlines
    (``<p>A</p><p>B</p>``), so before dropping tags we turn block-closing
    tags and ``<br>`` into newlines — otherwise every paragraph would collapse
    into a single run-on line when split on "\\n" downstream.
    """
    # Block boundaries -> newline (paragraphs, list items, breaks, headings).
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|li|h[1-6]|blockquote|tr)>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    # Collapse the runs of blank lines block tags can leave behind.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _build_letter_header(appeal: Appeal) -> dict:
    """Extract metadata for the letter header from the appeal chain."""
    claim = appeal.denial.claim
    practice = claim.practice
    payer = claim.payer
    patient = claim.patient
    denial = appeal.denial

    today = date.today()

    return {
        "practice_name": practice.name,
        "practice_address": "123 Medical Drive, Suite 100",
        "practice_city_state_zip": "Anytown, ST 12345",
        "practice_phone": "(555) 555-0100",
        "date": today.strftime("%B %d, %Y"),
        "payer_name": payer.name,
        "payer_address": "Claims Department",
        "payer_city_state_zip": "",
        "patient_name": patient.name,
        "patient_dob": patient.dob.strftime("%m/%d/%Y") if patient.dob else "",
        "claim_dos": claim.date_of_service.strftime("%B %d, %Y") if claim.date_of_service else "",
        "claim_cpt": ", ".join(claim.cpt_codes) if claim.cpt_codes else "",
        "claim_icd": ", ".join(claim.icd_codes) if claim.icd_codes else "",
        "denial_code": denial.denial_code or "",
        "billed_amount": f"${denial.denied_amount:,.2f}" if denial.denied_amount else "",
    }


def generate_pdf(appeal: Appeal) -> bytes:
    """Generate a professional appeal letter as PDF using reportlab."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        topMargin=1.2 * inch,
        bottomMargin=1 * inch,
    )

    styles = getSampleStyleSheet()
    letter_body = ParagraphStyle(
        "LetterBody",
        parent=styles["Normal"],
        fontSize=11,
        leading=15,
        spaceAfter=8,
        fontName="Times-Roman",
    )
    letter_header = ParagraphStyle(
        "LetterHeader",
        parent=styles["Normal"],
        fontSize=12,
        leading=16,
        fontName="Times-Bold",
    )

    meta = _build_letter_header(appeal)

    elements: list = []

    # ReportLab parses Paragraph input as XML-like markup, so any dynamic value
    # containing &, <, or > (e.g. "Blue Cross & Blue Shield") must be escaped to
    # avoid a parse error; only the literal <b>...</b> tags below stay unescaped.

    # Sender
    elements.append(
        Paragraph(f"<b>{escape(meta['practice_name'])}</b>", letter_header)
    )
    elements.append(Paragraph(escape(meta["practice_address"]), letter_body))
    elements.append(Paragraph(escape(meta["practice_city_state_zip"]), letter_body))
    elements.append(
        Paragraph(f"Phone: {escape(meta['practice_phone'])}", letter_body)
    )
    elements.append(Spacer(1, 18))

    # Date
    elements.append(Paragraph(escape(meta["date"]), letter_body))
    elements.append(Spacer(1, 12))

    # Recipient
    elements.append(
        Paragraph(f"<b>{escape(meta['payer_name'])}</b>", letter_header)
    )
    elements.append(Paragraph(escape(meta["payer_address"]), letter_body))
    if meta["payer_city_state_zip"]:
        elements.append(Paragraph(escape(meta["payer_city_state_zip"]), letter_body))
    elements.append(Spacer(1, 18))

    # Subject
    elements.append(
        Paragraph(
            f"<b>RE: Appeal of Denied Claim — Patient: {escape(meta['patient_name'])}"
            f" | Date of Service: {escape(meta['claim_dos'])}"
            f" | Denial Code: {escape(meta['denial_code'])}</b>",
            letter_body,
        )
    )
    elements.append(Spacer(1, 14))

    # Salutation
    elements.append(Paragraph("To Whom It May Concern:", letter_body))
    elements.append(Spacer(1, 10))

    # Letter body — strip HTML tags, use plain paragraphs
    letter_text = appeal.letter_text or ""
    clean = _strip_html(letter_text)
    for para in clean.split("\n"):
        stripped = para.strip()
        if stripped:
            elements.append(Paragraph(escape(stripped), letter_body))
    elements.append(Spacer(1, 14))

    # Closing
    elements.append(Paragraph("Sincerely,", letter_body))
    elements.append(Spacer(1, 28))
    elements.append(
        Paragraph(f"{meta['practice_name']}", letter_body)
    )
    elements.append(Paragraph("Billing Department", letter_body))

    doc.build(elements)
    buf.seek(0)
    return buf.read()


def generate_doc(appeal: Appeal) -> bytes:
    """Generate a professional appeal letter as DOCX using python-docx."""
    from docx import Document
    from docx.shared import Pt, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    meta = _build_letter_header(appeal)

    doc = Document()

    style = doc.styles["Normal"]
    font = style.font
    font.name = "Times New Roman"
    font.size = Pt(11)
    style.paragraph_format.space_after = Pt(6)
    style.paragraph_format.space_before = Pt(0)

    section = doc.sections[0]
    section.top_margin = Inches(1.2)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    def add_para(text, bold=False, size=11, space_before=0, space_after=6):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        run = p.add_run(text)
        run.font.size = Pt(size)
        run.font.name = "Times New Roman"
        run.bold = bold
        return p

    # Header
    add_para(meta["practice_name"], bold=True, size=12, space_after=2)
    add_para(meta["practice_address"], size=11, space_after=2)
    add_para(meta["practice_city_state_zip"], size=11, space_after=2)
    add_para(f"Phone: {meta['practice_phone']}", size=11, space_after=18)

    add_para(meta["date"], size=11, space_after=12)

    # Recipient
    add_para(meta["payer_name"], bold=True, size=12, space_after=2)
    add_para(meta["payer_address"], size=11, space_after=2)
    if meta["payer_city_state_zip"]:
        add_para(meta["payer_city_state_zip"], size=11, space_after=18)

    # Subject
    subject = (
        f"RE: Appeal of Denied Claim — Patient: {meta['patient_name']}"
        f" | Date of Service: {meta['claim_dos']}"
        f" | Denial Code: {meta['denial_code']}"
    )
    add_para(subject, bold=True, size=11, space_after=14)

    add_para("To Whom It May Concern:", size=11, space_after=10)

    # Letter body
    letter_text = appeal.letter_text or ""
    clean = _strip_html(letter_text)
    for para in clean.split("\n"):
        stripped = para.strip()
        if stripped:
            add_para(stripped, size=11, space_after=8)

    add_para("", size=11, space_after=14)
    add_para("Sincerely,", size=11, space_after=28)
    add_para(meta["practice_name"], size=11, space_after=2)
    add_para("Billing Department", size=11, space_after=2)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
