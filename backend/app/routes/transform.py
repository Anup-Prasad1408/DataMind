from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.schemas import RefineRequest, TransformRequest
from app.services.demo import build_demo, refine_demo
from app.services.documents import extract_document
from app.services.gemini import generate_with_gemini, refine_with_gemini

router = APIRouter(tags=["transformations"])
ALLOWED_FORMATS = {
    "flowchart", "mindmap", "structured_notes", "infographic", "timeline",
    "comparison_table", "step_by_step", "flashcards", "summary", "workflow",
    "mermaid", "presentation",
}


async def run_transform(text: str, options: dict) -> dict:
    settings = get_settings()
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Please provide some text to transform.")
    if len(text) > settings.max_text_chars:
        raise HTTPException(status_code=413, detail=f"Input is too long. Maximum is {settings.max_text_chars:,} characters.")
    fmt = options.get("format", "structured_notes")
    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(status_code=422, detail="Unsupported output format.")

    if settings.ai_enabled:
        try:
            return await generate_with_gemini(text, options)
        except Exception as exc:
            print(f"AI transformation failed: {type(exc).__name__}: {exc}")
            if not settings.ai_fallback_to_demo:
                raise HTTPException(status_code=502, detail=str(exc)[:350]) from exc
            result = build_demo(text, options)
            result["mode"] = "demo-fallback"
            result["ai_error"] = "Gemini is temporarily unavailable or quota-limited. A local result was generated instead."
            return result
    return build_demo(text, options)


@router.post("/transform")
async def transform(payload: TransformRequest) -> dict:
    return await run_transform(payload.text, payload.model_dump(exclude={"text"}))


@router.post("/transform/file")
async def transform_file(
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
    if format not in ALLOWED_FORMATS:
        raise HTTPException(status_code=422, detail="Unsupported output format.")
    result = await run_transform(text, {
        "format": format, "detail": detail, "language": language,
        "complexity": complexity, "audience": audience, "visual_style": visual_style,
    })
    result["source_filename"] = filename
    # Return extracted text so the browser can save/re-run this upload later.
    # The configured max_text_chars limit bounds the response size.
    result["source_text"] = text
    return result


@router.post("/refine")
async def refine(payload: RefineRequest) -> dict:
    settings = get_settings()
    if settings.ai_enabled:
        try:
            return await refine_with_gemini(payload.result, payload.instruction, payload.language, payload.complexity)
        except Exception as exc:
            print(f"AI refinement failed: {type(exc).__name__}: {exc}")
            if not settings.ai_fallback_to_demo:
                raise HTTPException(status_code=502, detail=str(exc)[:350]) from exc
    return refine_demo(payload.result, payload.instruction)
