from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.config import get_settings
from app.schemas import RefineRequest, TransformRequest
from app.services.demo import build_demo, refine_demo
from app.services.documents import extract_document
from app.services.gemini import generate_with_gemini, refine_with_gemini

router = APIRouter(tags=["transformations"])


async def run_transform(text: str, options: dict) -> dict:
    settings = get_settings()
    if len(text) > settings.max_text_chars:
        raise HTTPException(status_code=413, detail=f"Input is too long. Maximum is {settings.max_text_chars:,} characters.")
    if settings.ai_enabled:
        try:
            return await generate_with_gemini(text, options)
        except (RuntimeError, ValueError) as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail="AI generation failed unexpectedly. Check the backend logs and try again.") from exc
    return build_demo(text, options)


@router.post("/transform")
async def transform(payload: TransformRequest) -> dict:
    options = payload.model_dump(exclude={"text"})
    return await run_transform(payload.text, options)


@router.post("/transform/file")
async def transform_file(
    request: Request,
    file: UploadFile = File(...),
    format: str = Form("structured_notes"),
    detail: str = Form("medium"),
    language: str = Form("English"),
    complexity: str = Form("beginner"),
    audience: str = Form("students"),
    visual_style: str = Form("professional"),
) -> dict:
    settings = get_settings()
    try:
        text, filename = await extract_document(file, settings.max_upload_mb * 1024 * 1024, settings.max_text_chars)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await file.close()
    allowed_formats = {"flowchart", "mindmap", "structured_notes", "infographic", "timeline", "comparison_table", "step_by_step", "flashcards", "summary", "workflow", "mermaid", "presentation"}
    if format not in allowed_formats:
        raise HTTPException(status_code=422, detail="Unsupported output format.")
    options = {"format": format, "detail": detail, "language": language, "complexity": complexity, "audience": audience, "visual_style": visual_style}
    result = await run_transform(text, options)
    result["source_filename"] = filename
    return result


@router.post("/refine")
async def refine(payload: RefineRequest) -> dict:
    settings = get_settings()
    if settings.ai_enabled:
        try:
            return await refine_with_gemini(payload.result, payload.instruction, payload.language, payload.complexity)
        except (RuntimeError, ValueError) as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail="AI refinement failed unexpectedly.") from exc
    return refine_demo(payload.result, payload.instruction)
