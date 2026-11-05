from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


FormatName = Literal[
    "flowchart", "mindmap", "structured_notes", "infographic",
    "timeline", "comparison_table", "step_by_step", "flashcards",
    "summary", "workflow", "mermaid", "presentation",
]


class TransformRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100000)
    format: FormatName = "structured_notes"
    detail: Literal["short", "medium", "detailed"] = "medium"
    language: Literal["English", "Hindi", "Hinglish"] = "English"
    complexity: Literal["beginner", "intermediate", "advanced"] = "beginner"
    audience: Literal["students", "professionals", "developers", "general users"] = "students"
    visual_style: Literal["minimal", "professional", "colorful"] = "professional"

    @field_validator("text")
    @classmethod
    def clean_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Please enter some text before transforming.")
        return value


class RefineRequest(BaseModel):
    instruction: str = Field(min_length=2, max_length=800)
    result: dict[str, Any]
    language: Literal["English", "Hindi", "Hinglish"] = "English"
    complexity: Literal["beginner", "intermediate", "advanced"] = "beginner"

    @field_validator("instruction")
    @classmethod
    def clean_instruction(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Please enter an instruction.")
        return value


def make_result(
    *, title: str, format: str, content: str, mode: str,
    mermaid: str | None = None, cards: list[dict[str, Any]] | None = None,
    table: dict[str, Any] | None = None, ai_error: str | None = None,
) -> dict[str, Any]:
    safe_content = content.strip() if isinstance(content, str) else ""
    if not safe_content:
        safe_content = "## Written explanation unavailable\n\nPlease try the transformation again."
    output: dict[str, Any] = {
        "id": str(uuid4()),
        "title": (title or "DataMind transformation")[:120],
        "format": format,
        "content": safe_content,
        "mermaid": mermaid.strip() if isinstance(mermaid, str) and mermaid.strip() else None,
        "cards": cards if isinstance(cards, list) else [],
        "table": table if isinstance(table, dict) else None,
        "mode": mode,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if ai_error:
        output["ai_error"] = ai_error[:300]
    return output
