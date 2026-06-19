"""Provider-agnostic chat-model factory (TRD §3).

The LLM steps are coded against LangChain's chat-model interface so swapping
providers is a config change (``LLM_PROVIDER`` / ``LLM_MODEL``), not a rewrite.
Tests inject a fake model instead of calling ``get_chat_model()``.
"""

from functools import lru_cache
from typing import Any

from ..config import settings


@lru_cache(maxsize=None)
def get_chat_model(model: str | None = None) -> Any:
    """Build a chat model for ``model`` (defaults to ``LLM_MODEL``). Cached per
    model id so the flagship and fast models are each constructed once."""
    from langchain.chat_models import init_chat_model

    # pydantic-settings loads .env into Settings but does NOT export to os.environ,
    # so pass the key (and a generous max_tokens for the appeal letter) explicitly
    # rather than relying on the provider SDK reading the environment.
    kwargs: dict[str, Any] = {"max_tokens": 4096}
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        kwargs["api_key"] = settings.anthropic_api_key

    return init_chat_model(
        model or settings.llm_model, model_provider=settings.llm_provider, **kwargs
    )


def is_claude_provider() -> bool:
    """Claude-family providers accept native PDF document blocks; others fall
    back to text extraction in ``extract_eob``."""
    return settings.llm_provider in {"anthropic", "bedrock", "bedrock_converse"}
