from product_ai import (
    DEFAULT_PRODUCT_AI_MODEL,
    DEFAULT_PRODUCT_AI_PROVIDER,
    configure_product_chat,
    product_ai_settings,
)


class FakeChat:
    def __init__(self):
        self.selection = None

    def with_model(self, provider, model):
        self.selection = (provider, model)
        return self


def test_product_ai_defaults_to_openai_gpt():
    assert product_ai_settings({}) == {
        "provider": DEFAULT_PRODUCT_AI_PROVIDER,
        "model": DEFAULT_PRODUCT_AI_MODEL,
        "label": "OpenAI",
    }


def test_product_ai_is_configurable_without_exposing_a_key():
    chat = FakeChat()
    configured = configure_product_chat(
        chat,
        {"PRODUCT_AI_PROVIDER": "openai", "PRODUCT_AI_MODEL": "gpt-5-test"},
    )
    assert configured is chat
    assert chat.selection == ("openai", "gpt-5-test")
    assert "key" not in product_ai_settings({})
