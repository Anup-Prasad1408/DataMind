from app.services.demo import build_demo


def test_demo_result_has_written_content():
    result = build_demo(
        "A workflow begins with planning. Then teams collect data. Finally they review the results.",
        {"format": "flowchart", "language": "English"},
    )
    assert result["content"].strip()
    assert result["mermaid"].startswith("flowchart TD")
    assert result["mode"] == "demo"


def test_flashcard_demo_returns_cards():
    result = build_demo(
        "Photosynthesis lets plants convert light into energy. Chlorophyll absorbs light. Plants use water and carbon dioxide.",
        {"format": "flashcards", "language": "English"},
    )
    assert result["cards"]
    assert "question" in result["cards"][0]
    assert "answer" in result["cards"][0]


def test_all_formats_return_non_empty_content():
    source = (
        "A software project begins with planning. "
        "The team researches requirements and designs the system. "
        "Developers implement features and test the application. "
        "Finally, the team deploys the product and monitors feedback."
    )
    formats = [
        "flowchart", "mindmap", "structured_notes", "infographic",
        "timeline", "comparison_table", "step_by_step", "flashcards",
        "summary", "workflow", "mermaid", "presentation",
    ]
    for output_format in formats:
        result = build_demo(source, {"format": output_format, "language": "English"})
        assert result["format"] == output_format
        assert result["content"].strip()
        assert result["id"]
        if output_format in {"flowchart", "mindmap", "timeline", "workflow", "mermaid"}:
            assert result["mermaid"]
        if output_format == "comparison_table":
            assert result["table"]["headers"]
        if output_format == "flashcards":
            assert result["cards"]
        if output_format in {"infographic", "presentation"}:
            assert result["cards"]
