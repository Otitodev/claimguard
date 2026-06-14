from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_session
from .models import Practice
from .api import analytics, appeals, claims, denials, leads, webhooks

app = FastAPI(title="ClaimGuard API", version="0.1.0")

# Allow the Next.js frontend (browser-side upload + appeal mutations) to call
# the API cross-origin during local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(claims.router)
app.include_router(appeals.router)
app.include_router(denials.router)
app.include_router(analytics.router)
app.include_router(leads.router)
app.include_router(webhooks.router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}


@app.get("/practices", tags=["meta"])
def list_practices(session: Session = Depends(get_session)) -> list[dict]:
    """Convenience endpoint to grab the seeded practice_id for demos."""
    rows = session.scalars(select(Practice).order_by(Practice.created_at)).all()
    return [{"id": str(p.id), "name": p.name} for p in rows]
