from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ==============================
    # AI PROVIDER
    # ==============================
    gemini_api_key: str = ""

    # Current DataMind model
    gemini_model: str = "gemini-3.8-flash"

    # ==============================
    # TOKEN / PERFORMANCE CONTROL
    # ==============================

    # Keep input reasonably small so free-tier TPM
    # is not exhausted by a single request.
    ai_max_source_chars: int = 9000

    # Keep generated output controlled.
    ai_max_output_tokens: int = 2048

    # Do not retry 429 endlessly.
    ai_max_retries: int = 1

    # Request timeout.
    ai_timeout_seconds: float = 60.0

    # If AI fails because of quota/provider/network,
    # automatically use local deterministic transformation.
    ai_fallback_to_demo: bool = True

    # ==============================
    # CORS
    # ==============================

    allowed_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # ==============================
    # UPLOAD / INPUT
    # ==============================

    max_upload_mb: int = 8
    max_text_chars: int = 40000

    # ==============================
    # APP RATE LIMIT
    # ==============================

    rate_limit_per_minute: int = 20

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
