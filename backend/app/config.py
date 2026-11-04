from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_upload_mb: int = 8
    max_text_chars: int = 40000
    rate_limit_per_minute: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip())


@lru_cache

def get_settings() -> Settings:
    return Settings()
