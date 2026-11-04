from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "DataMind API",
        "mode": "ai" if settings.ai_enabled else "demo",
        "provider": "Google Gemini" if settings.ai_enabled else "Local demo engine",
        "model": settings.gemini_model if settings.ai_enabled else "deterministic-demo",
    }
