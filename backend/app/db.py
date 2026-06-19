import time
from collections.abc import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from .config import settings

# Lightweight additive migrations applied on init_db so an existing (already
# seeded) database picks up new nullable columns without a destructive reset.
_MIGRATIONS = (
    "ALTER TABLE practices ADD COLUMN IF NOT EXISTS agentmail_inbox_id text",
    "ALTER TABLE practices ADD COLUMN IF NOT EXISTS agentmail_address text",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_inbox "
    "ON practices (agentmail_inbox_id)",
    "ALTER TABLE practices ADD COLUMN IF NOT EXISTS owner_user_id text",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_owner "
    "ON practices (owner_user_id)",
    "ALTER TABLE appeals ADD COLUMN IF NOT EXISTS expected_response_date date",
    "ALTER TABLE appeals ADD COLUMN IF NOT EXISTS status_updated_at timestamptz",
    "ALTER TABLE practices ADD COLUMN IF NOT EXISTS plan text NOT NULL "
    "DEFAULT 'claimguard'",
)


def _make_iam_engine():
    """Engine for free-tier Aurora (express config): IAM token per connection.

    Aurora express clusters reject password auth — every new connection needs a
    fresh ~15-min RDS IAM token (minted via boto3) used as the password, over
    TLS. The cluster's internet access gateway lives in a `.aws.dev` zone that
    some local resolvers can't reach, so when ``db_dns_servers`` is set we
    resolve the endpoint via a public DNS and pass the IP as ``hostaddr`` while
    keeping ``host`` as the hostname for TLS SNI (which the gateway routes on).

    The gateway reaps idle connections *without a clean TCP reset*, so a pooled
    connection that gets reaped between requests makes the next ``pool_pre_ping``
    validation block on the dead socket until ``connect_timeout`` — pooling is
    actively slower here than not pooling. So we use ``NullPool``: a fresh,
    freshly-tokened connection per checkout (nothing idle to be reaped), with
    the ``creator`` retrying the transient resets that hit establishment. The
    cost is a full TLS connect per request (seconds, cross-Region) traded for
    reliability against a gateway that drops connections unpredictably.
    """
    import boto3
    import psycopg

    if not settings.db_host:
        raise RuntimeError("DB_IAM_AUTH=true requires DB_HOST (cluster endpoint)")

    rds = boto3.client("rds", region_name=settings.aws_region)
    dns_servers = [s.strip() for s in settings.db_dns_servers.split(",") if s.strip()]
    cached_ip: str | None = None
    cached_at = 0.0

    def resolve_hostaddr() -> str | None:
        nonlocal cached_ip, cached_at
        if not dns_servers:
            return None  # trust the system resolver via host
        now = time.time()
        if cached_ip and now - cached_at < 120:
            return cached_ip
        import dns.resolver

        resolver = dns.resolver.Resolver(configure=False)
        resolver.nameservers = dns_servers
        resolver.lifetime = 10
        cached_ip = resolver.resolve(settings.db_host, "A")[0].address
        cached_at = now
        return cached_ip

    def connect():
        last_exc: Exception | None = None
        for attempt in range(4):
            kwargs = {
                "host": settings.db_host,
                "port": settings.db_port,
                "user": settings.db_user,
                "dbname": settings.db_name,
                "password": rds.generate_db_auth_token(
                    DBHostname=settings.db_host,
                    Port=settings.db_port,
                    DBUsername=settings.db_user,
                    Region=settings.aws_region,
                ),
                "sslmode": settings.db_sslmode,
                "connect_timeout": 30,
            }
            ip = resolve_hostaddr()
            if ip:
                kwargs["hostaddr"] = ip
            try:
                return psycopg.connect(**kwargs)
            except psycopg.OperationalError as exc:  # transient gateway reset
                last_exc = exc
                time.sleep(0.5 * (attempt + 1))
        assert last_exc is not None
        raise last_exc

    return create_engine(
        "postgresql+psycopg://",
        future=True,
        poolclass=NullPool,
        creator=connect,
    )


if settings.db_iam_auth:
    engine = _make_iam_engine()
else:
    engine = create_engine(
        settings.database_url, future=True, pool_pre_ping=True
    )

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
