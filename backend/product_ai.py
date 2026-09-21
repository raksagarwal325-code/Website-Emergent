"""Shared model selection for all Admin product-intelligence workflows."""
import os


DEFAULT_PRODUCT_AI_PROVIDER = "openai"
DEFAULT_PRODUCT_AI_MODEL = "gpt-5"


def product_ai_settings(environ=None) -> dict:
    """Return normalized product-AI settings without exposing credentials."""
    source = os.environ if environ is None else environ
    provider = str(source.get("PRODUCT_AI_PROVIDER") or DEFAULT_PRODUCT_AI_PROVIDER).strip().lower()
    model = str(source.get("PRODUCT_AI_MODEL") or DEFAULT_PRODUCT_AI_MODEL).strip()
    return {
        "provider": provider,
        "model": model,
        "label": "OpenAI" if provider == "openai" else provider.title(),
    }


def configure_product_chat(chat, environ=None):
    """Apply the single product-AI provider/model choice to an LlmChat."""
    settings = product_ai_settings(environ)
    return chat.with_model(settings["provider"], settings["model"])
