import asyncio
import json

from app.services import gemini


def test_ai_flowchart_uses_local_visual_when_model_omits_mermaid(monkeypatch):
    async def fake_call(_prompt):
        return json.dumps({
            "title": "Workflow",
            "content": "## Overview\n\nA process has three stages.",
            "mermaid": None,
            "cards": [],
            "table": None,
        })

    monkeypatch.setattr(gemini, "_call_gemini", fake_call)
    result = asyncio.run(gemini.generate_with_gemini(
        "First, plan the work. Then implement the features. Finally, review the outcome.",
        {"format": "flowchart", "language": "English"},
    ))

    assert result["content"].strip()
    assert result["mermaid"].startswith("flowchart TD")


def test_refinement_preserves_existing_diagram_if_model_omits_it(monkeypatch):
    async def fake_call(_prompt):
        return json.dumps({
            "title": "Refined workflow",
            "content": "## Improved overview\n\nThe process is clearer now.",
            "mermaid": None,
            "cards": [],
            "table": None,
        })

    monkeypatch.setattr(gemini, "_call_gemini", fake_call)
    existing = {
        "id": "kept-by-client",
        "title": "Workflow",
        "format": "flowchart",
        "content": "Original notes",
        "mermaid": "flowchart TD\n A[Start] --> B[Finish]",
        "cards": [],
        "table": None,
    }
    result = asyncio.run(gemini.refine_with_gemini(existing, "Make it clearer", "English", "beginner"))
    assert result["content"].startswith("## Improved")
    assert result["mermaid"] == existing["mermaid"]
