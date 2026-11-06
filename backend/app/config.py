from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"

    ai_max_source_chars: int = Field(default=18000, ge=500, le=90000)
    ai_max_output_tokens: int = Field(default=3600, ge=512, le=8192)
    ai_estimated_tpm_budget: int = Field(default=7600, ge=1000, le=1000000)
    ai_max_retries: int = Field(default=0, ge=0, le=2)
    ai_min_interval_seconds: float = Field(default=1.5, ge=0, le=120)
    ai_timeout_seconds: float = Field(default=25.0, ge=10, le=180)
    ai_fallback_to_demo: bool = True

    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_upload_mb: int = Field(default=8, ge=1, le=25)
    max_text_chars: int = Field(default=100000, ge=1000, le=200000)
    rate_limit_per_minute: int = Field(default=12, ge=1, le=120)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
