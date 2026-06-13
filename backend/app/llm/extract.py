"""EOB extraction — the one genuinely provider-sensitive step (TRD §3).

``extract_eob`` is the isolation point: it hides whether the PDF was understood
natively (Claude document block) or via an OCR/text fallback, so the LangGraph
nodes never branch on provider.
"""

import base64
import io
import json

from ..schemas import ExtractedEOB
from .prompts import PARSE_EOB
from .provider import is_claude_provider


def pdf_to_text(pdf_bytes: bytes) -> str:
    """Best-effort text extraction (raw_extracted_text + non-Claude fallback)."""
    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages).strip()
    except Exception:
        return ""


def _claude_content(pdf_bytes: bytes) -> list[dict]:
    b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    return [
        {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": b64,
            },
        },
        {"type": "text", "text": PARSE_EOB},
    ]


def _text_content(pdf_bytes: bytes) -> list[dict]:
    text = pdf_to_text(pdf_bytes) or "(no extractable text)"
    return [{"type": "text", "text": f"{PARSE_EOB}\n\nDOCUMENT TEXT:\n{text}"}]


def extract_eob(llm, pdf_bytes: bytes) -> ExtractedEOB:
    """Extract structured EOB fields from a PDF using the configured model."""
    from langchain_core.messages import HumanMessage

    content = _claude_content(pdf_bytes) if is_claude_provider() else _text_content(
        pdf_bytes
    )
    message = HumanMessage(content=content)

    try:
        structured = llm.with_structured_output(ExtractedEOB)
        return structured.invoke([message])
    except Exception:
        # Two-step fallback: free-form JSON, then validate into the model.
        raw = llm.invoke([message])
        text = raw.content if hasattr(raw, "content") else str(raw)
        if isinstance(text, list):  # content blocks
            text = "".join(b.get("text", "") for b in text if isinstance(b, dict))
        start, end = text.find("{"), text.rfind("}")
        payload = text[start : end + 1] if start != -1 and end != -1 else "{}"
        return ExtractedEOB.model_validate(json.loads(payload))
