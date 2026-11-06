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


def test_identical_prompt_response_is_cached():
    prompt = "same prompt for cache verification"
    gemini._store_cached_response(prompt, "cached response")
    assert gemini._get_cached_response(prompt) == "cached response"


def test_busy_ai_slot_fails_fast(monkeypatch):
    class Settings:
        ai_enabled = True

    monkeypatch.setattr(gemini, "get_settings", lambda: Settings())

    async def exercise():
        await gemini._ai_lock.acquire()
        try:
            try:
                await gemini._call_gemini("small request")
            except RuntimeError as exc:
                assert "already running" in str(exc)
            else:
                raise AssertionError("Busy AI slot should fail fast.")
        finally:
            gemini._ai_lock.release()

    asyncio.run(exercise())


def test_ai_result_attaches_all_source_rows_even_if_model_output_is_sampled(monkeypatch):
    source_lines = [
        "This collection lists 25 Samsung-based AI capstone projects across several domains.",
        "| Domain | Project ID | Real Problem | Use-Case | AI Technologies |",
        "|---|---|---|---|---|",
    ]
    for index in range(1, 26):
        source_lines.append(
            f"| Domain {index} | SIC 20-{index:02d} | Problem {index} | Use case {index} | ML, NLP {index} |"
        )
    source = "\n".join(source_lines)

    async def fake_call(_prompt):
        # Deliberately simulate a model that returns only 8 example rows.
        return json.dumps({
            "title": "Sampled project table",
            "content": "## Overview\n\nThe model gave a short sample.",
            "mermaid": None,
            "cards": [],
            "table": {
                "headers": ["Domain", "Project ID"],
                "rows": [[f"Domain {i}", f"SIC 20-{i:02d}"] for i in range(1, 9)],
            },
        })

    monkeypatch.setattr(gemini, "_call_gemini", fake_call)
    result = asyncio.run(gemini.generate_with_gemini(
        source,
        {"format": "comparison_table", "detail": "detailed", "language": "English"},
    ))

    assert len(result["source_table"]["rows"]) == 25
    assert len(result["table"]["rows"]) == 25
    assert result["coverage"]["complete"] is True
