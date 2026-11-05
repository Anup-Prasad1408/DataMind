import re
from typing import Any

from app.schemas import make_result


def _sentences(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    bits = re.split(r"(?<=[.!?।])\s+|\n+", cleaned)
    return [b.strip(" -•\t") for b in bits if len(b.strip()) > 15]


def _label(value: str, limit: int = 48) -> str:
    value = re.sub(r"[\[\]{}<>\"'`#;|]", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return (value[:limit].rstrip() or "Key idea")


def _diagram(text: str, fmt: str) -> str:
    items = [_label(s, 42) for s in _sentences(text)[:6]] or ["Start", "Understand the topic", "Apply the idea"]
    if len(items) == 1:
        items.append("Review the key idea")
    if fmt == "mindmap":
        lines = ["mindmap", f"  root(({_label(items[0], 32)}))"]
        for item in items[1:]:
            lines.append(f"    {_label(item, 42)}")
        return "\n".join(lines)
    lines = ["flowchart TD"]
    for index, item in enumerate(items):
        lines.append(f'  N{index}["{item}"]')
        if index:
            lines.append(f"  N{index-1} --> N{index}")
    if fmt == "workflow":
        lines.insert(1, "  Start([Start])")
        lines.insert(2, "  Start --> N0")
        lines.append(f"  N{len(items)-1} --> Finish([Finish])")
    return "\n".join(lines)


def build_demo(text: str, options: dict[str, Any]) -> dict[str, Any]:
    fmt = options.get("format", "structured_notes")
    sentences = _sentences(text)
    lines = [s for s in sentences if s]
    title = _label(lines[0] if lines else text, 72)
    key_points = lines[:8] or [text[:500]]
    bullets = "\n".join(f"- {item}" for item in key_points)

    language = options.get("language", "English")
    note = "\n\n> Local fallback: this result was created without an AI call. It organizes the provided text but does not add external facts."

    if fmt == "summary":
        content = f"## Summary\n\n{(' '.join(key_points[:3]))}\n\n## Key points\n{bullets}"
    elif fmt == "step_by_step":
        content = "## Step-by-step guide\n\n" + "\n".join(f"{i}. {item}" for i, item in enumerate(key_points, 1))
    elif fmt == "structured_notes":
        content = f"## Overview\n\n{key_points[0]}\n\n## Key concepts\n{bullets}\n\n## Review\n\nRevisit each point and connect it to the source material."
    elif fmt == "presentation":
        content = "## Suggested presentation\n\n" + "\n\n".join(f"### Slide {i}: {_label(item, 45)}\n\n{item}" for i, item in enumerate(key_points[:6], 1))
    elif fmt == "timeline":
        content = "## Timeline (source order)\n\n" + "\n".join(f"- **Stage {i}:** {item}" for i, item in enumerate(key_points, 1))
    elif fmt == "comparison_table":
        content = "## Comparison\n\nThe source did not provide explicit comparison categories. The table below organizes its first points for review."
    elif fmt == "flashcards":
        content = "## Flashcards\n\nReview each question, then reveal its answer."
    elif fmt == "infographic":
        content = "## Key information\n\nThe cards below summarize statements extracted from your source."
    elif fmt in {"flowchart", "workflow", "mindmap", "mermaid"}:
        content = f"## Diagram overview\n\nThis diagram arranges the main statements in source order.\n\n{bullets}"
    else:
        content = f"## {title}\n\n{bullets}"

    cards: list[dict[str, Any]] = []
    table = None
    if fmt == "flashcards":
        cards = [{"question": f"What does this point state?", "answer": item} for item in key_points[:8]]
    elif fmt == "infographic":
        cards = [{"title": f"Key point {i}", "body": item} for i, item in enumerate(key_points[:6], 1)]
    elif fmt == "comparison_table":
        table = {"headers": ["Point", "Source statement"], "rows": [[f"Point {i}", item] for i, item in enumerate(key_points[:8], 1)]}
    elif fmt == "presentation":
        cards = [{"title": f"Slide {i}", "body": item} for i, item in enumerate(key_points[:6], 1)]

    diagram = _diagram(text, "mindmap" if fmt == "mindmap" else ("workflow" if fmt == "workflow" else "flowchart")) if fmt in {"flowchart", "mindmap", "workflow", "mermaid", "timeline"} else None
    if fmt == "timeline":
        diagram = "timeline\n    title Source sequence\n" + "\n".join(f"    Stage {i} : {_label(item, 50)}" for i, item in enumerate(key_points[:6], 1))

    if language == "Hindi":
        content = "## स्थानीय परिणाम\n\nयह परिणाम दिए गए पाठ से बनाया गया है।\n\n" + bullets
    elif language == "Hinglish":
        content = "## Quick breakdown\n\nYeh points aapke diye gaye text se extract kiye gaye hain.\n\n" + bullets
    content += note

    return make_result(title=title, format=fmt, content=content, mode="demo", mermaid=diagram, cards=cards, table=table)


def refine_demo(result: dict[str, Any], instruction: str) -> dict[str, Any]:
    original = str(result.get("content") or "")
    addition = f"\n\n## Refinement note\n\nRequested change: {instruction}\n\nThis local fallback preserves the existing content. Configure a valid Gemini key to apply AI-based rewriting."
    return make_result(
        title=str(result.get("title") or "Refined DataMind result"),
        format=str(result.get("format") or "structured_notes"),
        content=(original + addition)[:12000],
        mode="demo-fallback",
        mermaid=result.get("mermaid") if isinstance(result.get("mermaid"), str) else None,
        cards=result.get("cards") if isinstance(result.get("cards"), list) else [],
        table=result.get("table") if isinstance(result.get("table"), dict) else None,
    )
