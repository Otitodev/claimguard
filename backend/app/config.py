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


settings = Settings()
