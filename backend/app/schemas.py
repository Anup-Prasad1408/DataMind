from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

FormatName = Literal[
    "flowchart", "mindmap", "structured_notes", "infographic", "timeline",
    "comparison_table", "step_by_step", "flashcards", "summary", "workflow",
    "mermaid", "presentation",
]


class TransformRequest(BaseModel):
    text: str = Field(min_length=1, max_length=40000)
    format: FormatName = "structured_notes"
    detail: Literal["short", "medium", "detailed"] = "medium"
    language: Literal["English", "Hindi", "Hinglish"] = "English"
    complexity: Literal["beginner", "intermediate", "advanced"] = "beginner"
    audience: Literal["students", "professionals", "developers", "general users"] = "students"
    visual_style: Literal["minimal", "professional", "colorful"] = "professional"

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Please provide some text to transform.")
        return value.strip()


class RefineRequest(BaseModel):
    instruction: str = Field(min_length=2, max_length=1000)
    result: dict[str, Any]
    language: str = "English"
    complexity: str = "beginner"

    @field_validator("instruction")
    @classmethod
    def instruction_must_not_be_blank(cls, value: str) -> str:
        return value.strip()


def make_result(
    *, title: str, format: str, content: str, mode: str,
    mermaid: str | None = None, cards: list[dict[str, str]] | None = None,
    table: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "title": title[:100],
        "format": format,
        "content": content,
        "mermaid": mermaid,
        "cards": cards or [],
        "table": table,
        "mode": mode,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
