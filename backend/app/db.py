from collections.abc import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from .config import settings

# Lightweight additive migrations applied on init_db so an existing (already
# seeded) database picks up new nullable columns without a destructive reset.
_MIGRATIONS = (
    "ALTER TABLE practices ADD COLUMN IF NOT EXISTS agentmail_inbox_id text",
    "ALTER TABLE practices ADD COLUMN IF NOT EXISTS agentmail_address text",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_inbox "
    "ON practices (agentmail_inbox_id)",
)

engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables from the ORM metadata (local-dev convenience).

    ``schema.sql`` is the canonical DDL for Aurora deploys; the ORM models in
    ``app/models.py`` mirror it and let local dev skip a psql step.
    """
    from .models import Base

    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        for stmt in _MIGRATIONS:
            conn.execute(text(stmt))
