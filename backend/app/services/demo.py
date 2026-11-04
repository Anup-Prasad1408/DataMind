import re
from typing import Any

from app.schemas import make_result


def clean_label(value: str, limit: int = 52) -> str:
    value = re.sub(r"[\[\]{}()<>\"`]", "", value)
    value = re.sub(r"\s+", " ", value).strip(" .,:;-")
    return (value[: limit - 1] + "…") if len(value) > limit else value or "Key idea"


def split_points(text: str) -> list[str]:
    pieces = re.split(r"(?<=[.!?])\s+|\n+|(?<=;)\s+", text.strip())
    return [clean_label(item, 110) for item in pieces if len(item.strip()) > 7][:9]


def title_from(text: str) -> str:
    first = re.split(r"[.!?\n]", text.strip())[0]
    return clean_label(first, 58) or "Your transformation"


def build_demo(text: str, options: dict[str, Any]) -> dict[str, Any]:
    fmt = options.get("format", "structured_notes")
    points = split_points(text) or [clean_label(text, 100)]
    title = title_from(text)
    cards = []
    table = None
    diagram = None

    if fmt in {"flowchart", "workflow", "mermaid"}:
        direction = "LR" if fmt == "workflow" else "TD"
        selected_points = points[:7]
        point_ids = [chr(66 + index) for index in range(len(selected_points))]
        nodes = ['  A(["Start"])']
        nodes.extend(f'  {node}["{clean_label(point, 48)}"]' for node, point in zip(point_ids, selected_points))
        nodes.append('  Z(["End"])')
        chain = ['A'] + point_ids + ['Z']
        links = [f"  {left} --> {right}" for left, right in zip(chain, chain[1:])]
        diagram = f"flowchart {direction}\n" + "\n".join(nodes + links)
        content = "## Process overview\n\n" + "\n".join(f"{i + 1}. {point}" for i, point in enumerate(points)) + "\n\n> Demo mode: this example is generated from sentence boundaries, not AI reasoning."
    elif fmt == "mindmap":
        root = clean_label(title, 38)
        branches = "\n".join(f"    {clean_label(point, 48)}" for point in points[:8])
        diagram = f"mindmap\n  root(({root}))\n{branches}"
        content = "## Central idea\n\n" + title + "\n\n## Connected ideas\n" + "\n".join(f"- {point}" for point in points)
    elif fmt == "timeline":
        entries = "\n".join(f"  {i + 1} : {clean_label(point, 48)}" for i, point in enumerate(points[:8]))
        diagram = f"timeline\n  title {clean_label(title, 40)}\n  section Key stages\n{entries}"
        content = "## Timeline sequence\n\n" + "\n".join(f"**Stage {i + 1}:** {point}" for i, point in enumerate(points))
    elif fmt == "structured_notes":
        content = f"# {title}\n\n## Overview\n{text.strip()}\n\n## Key points\n" + "\n".join(f"- {point}" for point in points)
    elif fmt == "summary":
        content = "## In brief\n\n" + " ".join(points[:3]) + ("" if len(points) <= 3 else "\n\n## Also important\n" + "\n".join(f"- {p}" for p in points[3:6]))
    elif fmt == "step_by_step":
        content = "## Step-by-step guide\n\n" + "\n".join(f"### Step {i + 1}\n{point}" for i, point in enumerate(points)) + "\n\n## Finish\nReview the steps and confirm the outcome."
    elif fmt == "flashcards":
        cards = [{"question": f"What is the key idea in point {i + 1}?", "answer": point} for i, point in enumerate(points[:8])]
        content = "## How to use these cards\n\nSelect a card to reveal its answer. These demo cards are created from the sentences in your input."
    elif fmt == "infographic":
        cards = [{"title": f"Key idea {i + 1}", "body": point} for i, point in enumerate(points[:6])]
        content = "## At a glance\n\nThe cards above organize the main statements from your source text."
    elif fmt == "comparison_table":
        table = {"headers": ["Item", "Information"], "rows": [[f"Point {i + 1}", point] for i, point in enumerate(points)]}
        content = "## Comparison view\n\nThe table separates the statements in your source. For a meaningful side-by-side comparison, include at least two clearly named concepts in your input."
    elif fmt == "presentation":
        content = "# Presentation outline\n\n" + "\n".join(f"## Slide {i + 1}: {clean_label(point, 52)}\n- Explain the main idea\n- Add one relevant example or visual\n- Connect this point to the overall topic\n" for i, point in enumerate(points[:8]))
    else:
        content = "## Key information\n\n" + "\n".join(f"- {point}" for point in points)

    return make_result(title=title, format=fmt, content=content, mode="demo", mermaid=diagram, cards=cards, table=table)


def refine_demo(result: dict[str, Any], instruction: str) -> dict[str, Any]:
    updated = dict(result)
    content = str(updated.get("content", ""))
    instruction_lower = instruction.lower()
    if any(word in instruction_lower for word in ("short", "concise", "brief", "shorter")):
        paragraphs = [line for line in content.splitlines() if line.strip()]
        updated["content"] = "\n\n".join(paragraphs[:7])
    elif any(word in instruction_lower for word in ("hinglish", "hindi")):
        updated["content"] = content + "\n\n> Language note: Demo mode does not perform reliable translation. Add a Gemini API key for language-aware rewriting."
    elif any(word in instruction_lower for word in ("quiz", "question")):
        snippets = [line.strip(" -*#0123456789.") for line in content.splitlines() if len(line.strip()) > 18][:5]
        updated["content"] = content + "\n\n## Practice questions\n" + "\n".join(f"{i + 1}. Explain this idea in your own words: {snippet}" for i, snippet in enumerate(snippets))
    else:
        updated["content"] = content + f"\n\n## Follow-up note\n\nDemo mode received this instruction: **{instruction}**. Configure Gemini in the backend to apply semantic AI edits."
    updated["mode"] = "demo"
    return updated
