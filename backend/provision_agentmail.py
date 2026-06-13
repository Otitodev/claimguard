"""Provision an AgentMail inbox + webhook for a practice (go-live step, TRD §5).

Usage:
    python provision_agentmail.py [practice_id]

Requires AGENTMAIL_API_KEY and PUBLIC_BASE_URL in backend/.env (PUBLIC_BASE_URL
is your public https tunnel, e.g. an ngrok URL forwarding to localhost:8000).
With no practice_id, uses the first (seeded) practice.

Prints the webhook signing secret — add it to backend/.env as
AGENTMAIL_WEBHOOK_SECRET and restart the backend so inbound webhooks verify.
"""

import sys

from app.config import settings
from app.db import SessionLocal, init_db
from app.models import Practice
from app.services import agentmail_client


def main() -> None:
    if not settings.agentmail_api_key:
        sys.exit("Set AGENTMAIL_API_KEY in backend/.env")
    if not settings.public_base_url:
        sys.exit(
            "Set PUBLIC_BASE_URL in backend/.env (your public https tunnel URL)"
        )

    init_db()
    session = SessionLocal()
    try:
        if len(sys.argv) > 1:
            practice = session.get(Practice, sys.argv[1])
        else:
            practice = (
                session.query(Practice).order_by(Practice.created_at).first()
            )
        if practice is None:
            sys.exit("No practice found — run seed.py first")

        inbox_id, address = agentmail_client.create_inbox()
        practice.agentmail_inbox_id = inbox_id
        practice.agentmail_address = address

        webhook_url = settings.public_base_url.rstrip("/") + "/webhooks/agentmail"
        webhook_id, secret = agentmail_client.create_webhook(webhook_url)
        session.commit()

        print(f"Practice : {practice.name} ({practice.id})")
        print(f"Inbox    : {address}  (id {inbox_id})")
        print(f"Webhook  : {webhook_url}  (id {webhook_id})")
        print()
        print("Add this to backend/.env and restart the backend:")
        print(f"  AGENTMAIL_WEBHOOK_SECRET={secret}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
