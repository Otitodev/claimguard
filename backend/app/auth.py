"""Frontend session verification.

The Next.js frontend authenticates users with Better Auth and forwards an ES256
JWT (Better Auth's `jwt` plugin) as a Bearer token. This module verifies that
token against the frontend's JWKS endpoint and resolves the authenticated user
to a Practice — so endpoints derive the tenant from the verified identity rather
than trusting a client-supplied `practice_id`.
"""

from functools import lru_cache

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_session
from .models import Practice


def _jwks_url() -> str:
    return settings.better_auth_jwks_url or f"{settings.better_auth_url}/api/auth/jwks"


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    # PyJWKClient caches fetched signing keys; the Ed/EC public key is stable.
    return PyJWKClient(_jwks_url())


def get_current_claims(authorization: str | None = Header(default=None)) -> dict:
    """Verify the Bearer JWT and return its claims (sub, email, name, …)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            issuer=settings.better_auth_url,
            # Better Auth sets aud to the app URL; we authorize on issuer + the
            # JWKS signature, so audience verification is not required here.
            options={"verify_aud": False},
        )
    except Exception as exc:  # invalid / expired / unreachable JWKS
        raise HTTPException(401, "invalid token") from exc
    if not claims.get("sub"):
        raise HTTPException(401, "token missing subject")
    return claims


def get_current_practice(
    claims: dict = Depends(get_current_claims),
    session: Session = Depends(get_session),
) -> Practice:
    """Resolve the authenticated user to their Practice (creating it on first
    sign-in).

    On a user's first request we adopt the oldest *unowned* practice — so a new
    account lands on the seeded demo data rather than an empty dashboard — and
    fall back to provisioning a fresh practice once the demo one is claimed.
    """
    user_id = str(claims["sub"])

    practice = session.scalars(
        select(Practice).where(Practice.owner_user_id == user_id)
    ).first()
    if practice is not None:
        return practice

    practice = session.scalars(
        select(Practice)
        .where(Practice.owner_user_id.is_(None))
        .order_by(Practice.created_at.asc())
    ).first()
    if practice is not None:
        practice.owner_user_id = user_id
    else:
        name = claims.get("name") or claims.get("email") or "My Practice"
        practice = Practice(name=str(name), owner_user_id=user_id)
        session.add(practice)
    session.commit()
    session.refresh(practice)
    return practice
