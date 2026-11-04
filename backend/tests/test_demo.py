from app.services.demo import build_demo, refine_demo


def test_flowchart_contains_connected_start_and_end():
    result = build_demo("Plan the task. Collect data. Review the result.", {"format": "flowchart"})
    assert result["mode"] == "demo"
    assert result["mermaid"].startswith("flowchart TD")
    assert "A --> B" in result["mermaid"]
    assert "D --> Z" in result["mermaid"]


def test_flashcards_are_returned_for_flashcard_format():
    result = build_demo("Arrays store items. Stacks follow LIFO order.", {"format": "flashcards"})
    assert len(result["cards"]) == 2
    assert "question" in result["cards"][0]


def test_demo_refinement_is_explicitly_not_ai():
    original = build_demo("First idea. Second idea.", {"format": "summary"})
    refined = refine_demo(original, "Make it shorter")
    assert refined["mode"] == "demo"
    assert "## In brief" in refined["content"]
