from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment / .env.

    The LLM fields drive the provider abstraction (TRD §3): change
    ``LLM_PROVIDER`` / ``LLM_MODEL`` to route the same pipeline through a
    different backend (e.g. ``bedrock``) without touching code.
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = (
        "postgresql+psycopg://claimguard:claimguard@localhost:5432/claimguard"
    )

    # Comma-separated CORS origins allowed to call the API from a browser.
    # Defaults to local Next.js dev; in production set this to include the
    # deployed Vercel domain (e.g. "https://claimguard.vercel.app").
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    llm_provider: str = "anthropic"
    llm_model: str = "claude-opus-4-8"

    # langchain-anthropic reads ANTHROPIC_API_KEY from the environment directly;
    # surfaced here so config.Settings is the single source of truth.
    anthropic_api_key: str | None = None

    # AgentMail email-in ingestion (TRD §5).
    agentmail_api_key: str | None = None
    # Svix signing secret (whsec_...) for verifying inbound webhooks.
    agentmail_webhook_secret: str | None = None
    # Public base URL the AgentMail webhook should target (e.g. an ngrok URL).
    # Used by the provisioning script when registering the webhook.
    public_base_url: str | None = None
    # AgentMail REST base.
    agentmail_base_url: str = "https://api.agentmail.to/v0"

    # --- Aurora (free-tier "express configuration") IAM auth ------------------
    # Free-tier Aurora clusters have no VPC/password: access is via a managed
    # internet access gateway using short-lived RDS IAM auth tokens over TLS.
    # When db_iam_auth is true, db.py mints a token per connection instead of
    # using the password in database_url. Local Docker dev leaves this false.
    db_iam_auth: bool = False
    db_host: str | None = None  # cluster writer endpoint (also the TLS SNI name)
    db_port: int = 5432
    db_user: str = "dbadmin"
    db_name: str = "postgres"
    db_sslmode: str = "require"
    aws_region: str | None = None
    # Comma-separated public DNS servers used to resolve db_host. The express
    # gateway lives in a `.aws.dev` zone that some local/ISP resolvers fail to
    # resolve; setting this routes the lookup around them. Empty -> system
    # resolver (and no hostaddr override).
    db_dns_servers: str = ""


settings = Settings()
