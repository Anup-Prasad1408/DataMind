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
