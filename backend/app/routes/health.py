from fastapi import APIRouter
from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "DataMind API",
        "mode": "ai" if settings.ai_enabled else "demo",
        "provider": "Google Gemini" if settings.ai_enabled else "Local fallback",
        "model": settings.gemini_model if settings.ai_enabled else "deterministic-demo",
        "fallback_enabled": settings.ai_fallback_to_demo,
        "max_source_chars": settings.ai_max_source_chars,
        "max_output_tokens": settings.ai_max_output_tokens,
        "estimated_tpm_budget": settings.ai_estimated_tpm_budget,
        "ai_min_interval_seconds": settings.ai_min_interval_seconds,
    }
