"""AgentMail inbound webhook (TRD §5).

Flow: verify the Svix signature → return 202 immediately → in the background,
download each PDF attachment and run it through the same pipeline as manual
upload. The practice is derived from ``message.inbox_id`` via the
``practices.agentmail_inbox_id`` mapping.
"""

import json
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from sqlalchemy import select

from ..config import settings
from ..db import SessionLocal
from ..models import Practice
from ..pipeline.graph import run_pipeline
from ..services import agentmail_client

logger = logging.getLogger("claimguard.agentmail")
router = APIRouter(tags=["webhooks"])


def _verify_signature(raw_body: bytes, headers) -> bool:
    secret = settings.agentmail_webhook_secret
    if not secret:
        logger.warning(
            "AGENTMAIL_WEBHOOK_SECRET unset — skipping signature verification "
            "(dev only)"
        )
        return True
    try:
        from svix.webhooks import Webhook

        Webhook(secret).verify(raw_body, dict(headers))
        return True
    except Exception:
        return False


def _is_pdf(att: dict) -> bool:
    if att.get("inline"):
        return False
    ct = (att.get("content_type") or "").lower()
    fn = (att.get("filename") or "").lower()
    return "pdf" in ct or fn.endswith(".pdf")


def _process(
    practice_id: uuid.UUID,
    inbox_id: str,
    message_id: str,
    attachments: list[dict],
) -> None:
    session = SessionLocal()
    try:
        for att in attachments:
            if not _is_pdf(att):
                continue
            attachment_id = att.get("attachment_id")
            if not attachment_id:
                continue
            try:
                pdf_bytes = agentmail_client.download_attachment(
                    inbox_id, message_id, attachment_id
                )
            except Exception:
                logger.exception(
                    "failed to download attachment %s on message %s",
                    attachment_id,
                    message_id,
                )
                continue
            run_pipeline(
                session,
                practice_id=practice_id,
                pdf_bytes=pdf_bytes,
                source_document_url=att.get("filename") or attachment_id,
                source="email",
            )
    finally:
        session.close()


@router.post("/webhooks/agentmail", status_code=202)
async def agentmail_webhook(
    request: Request, background_tasks: BackgroundTasks
) -> dict:
    raw = await request.body()
    if not _verify_signature(raw, request.headers):
        raise HTTPException(401, "invalid signature")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(400, "invalid JSON")

    if payload.get("event_type") != "message.received":
        return {"status": "ignored", "event_type": payload.get("event_type")}

    message = payload.get("message") or {}
    inbox_id = message.get("inbox_id")
    message_id = message.get("message_id")
    attachments = message.get("attachments") or []
    if not inbox_id or not message_id:
        raise HTTPException(400, "missing inbox_id or message_id")

    session = SessionLocal()
    try:
        practice = session.scalars(
            select(Practice).where(Practice.agentmail_inbox_id == inbox_id)
        ).first()
        practice_id = practice.id if practice else None
    finally:
        session.close()

    if practice_id is None:
        logger.warning("no practice mapped to inbox %s — ignoring", inbox_id)
        return {"status": "ignored", "reason": "unknown inbox"}

    pdf_count = sum(1 for a in attachments if _is_pdf(a))
    background_tasks.add_task(
        _process, practice_id, inbox_id, message_id, attachments
    )
    return {"status": "accepted", "pdf_attachments": pdf_count}
