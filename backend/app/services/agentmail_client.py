"""Thin wrapper around AgentMail (TRD §5).

External calls are isolated here so the webhook handler and provisioning script
can be tested with mocks. Inbox/webhook creation use the official ``agentmail``
SDK; attachment download uses the documented REST endpoint directly (returns
raw bytes, no SDK return-type ambiguity).
"""

from functools import lru_cache
from typing import Optional
from urllib.parse import quote

import httpx

from ..config import settings


@lru_cache(maxsize=1)
def _client():
    from agentmail import AgentMail

    return AgentMail(api_key=settings.agentmail_api_key)


def create_inbox() -> tuple[Optional[str], Optional[str]]:
    """Create a dedicated inbox; returns (inbox_id, email_address).

    Creates a default AgentMail inbox (random local-part). A custom local-part
    like ``denials-<slug>@yourdomain`` requires a verified domain and a
    ``CreateInboxRequest`` — configure that per AgentMail's docs once a domain
    is verified; the webhook maps on ``inbox_id`` regardless of the address.
    """
    inbox = _client().inboxes.create()
    inbox_id = getattr(inbox, "inbox_id", None) or getattr(inbox, "id", None)
    address = getattr(inbox, "email", None) or inbox_id
    return inbox_id, address


def create_webhook(url: str) -> tuple[Optional[str], Optional[str]]:
    """Register a message.received webhook; returns (webhook_id, signing_secret)."""
    wh = _client().webhooks.create(url=url, event_types=["message.received"])
    return getattr(wh, "webhook_id", None), getattr(wh, "secret", None)


def download_attachment(
    inbox_id: str, message_id: str, attachment_id: str
) -> bytes:
    """Download an attachment's raw bytes.

    GET /v0/inboxes/{inbox_id}/messages/{message_id}/attachments/{attachment_id}
    now returns JSON metadata with a short-lived presigned ``download_url`` (the
    CDN link to the actual bytes), not the bytes inline — so we follow that. We
    keep a fallback for the older behaviour (and any deployment that still
    returns the bytes directly): if the response isn't the JSON wrapper, return
    its body as-is.
    """
    url = (
        f"{settings.agentmail_base_url}/inboxes/{quote(inbox_id, safe='')}"
        f"/messages/{quote(message_id, safe='')}"
        f"/attachments/{quote(attachment_id, safe='')}"
    )
    resp = httpx.get(
        url,
        headers={"Authorization": f"Bearer {settings.agentmail_api_key}"},
        timeout=30.0,
    )
    resp.raise_for_status()

    content_type = resp.headers.get("content-type", "")
    if "application/json" in content_type:
        download_url = resp.json().get("download_url")
        if not download_url:
            raise ValueError("attachment metadata missing download_url")
        # Presigned CDN URL — no auth header, may redirect.
        dl = httpx.get(download_url, timeout=30.0, follow_redirects=True)
        dl.raise_for_status()
        return dl.content

    # Backward-compat: endpoint returned the raw bytes directly.
    return resp.content
