from pathlib import Path

from app.services.source_coverage import (
    build_detailed_source_appendix,
    build_source_cards,
    build_source_diagram,
    enrich_result_with_coverage,
    extract_source_coverage,
)


FIXTURE = Path(__file__).parent / "fixtures" / "ai_projects_25_layout.txt"


def test_actual_pdf_layout_extracts_all_25_projects_and_all_six_columns():
    extracted = extract_source_coverage(FIXTURE.read_text(encoding="utf-8"))
    table = extracted["source_table"]
    assert table is not None
    assert table["extraction_method"] == "pdf-layout-columns"
    assert len(table["headers"]) == 6
    assert len(table["rows"]) == 25
    assert extracted["coverage"]["actual_count"] == 25
    assert extracted["coverage"]["expected_count"] == 25
    assert extracted["coverage"]["complete"] is True
    assert table["rows"][0] == [
        "1", "SIC 2.0-01", "Smart Home", "AI Energy Saver for Smart Homes",
        "Users waste electricity due to inefficient appliance usage",
        "ML Forecasting, IoT Analytics, AI Recommendation",
    ]
    assert table["rows"][-1][1] == "SIC 2.0-25"
    assert table["rows"][-1][3] == "AI Skill Development Roadmap Generator"


def test_detailed_appendix_contains_every_project_and_every_source_field():
    extracted = extract_source_coverage(FIXTURE.read_text(encoding="utf-8"))
    report = build_detailed_source_appendix(extracted, "detailed", "English")
    for number in range(1, 26):
        assert f"SIC 2.0-{number:02d}" in report
    assert "AI technologies listed in source" in report
    assert "Suggested build focus" in report
    assert "Manual quality checking in factories is slow" in report


def test_each_visual_format_preserves_all_25_records():
    extracted = extract_source_coverage(FIXTURE.read_text(encoding="utf-8"))
    assert len(build_source_cards(extracted, "flashcards")) == 25
    assert len(build_source_cards(extracted, "infographic")) == 25
    for output_format in ("flowchart", "mindmap", "workflow", "mermaid", "timeline"):
        diagram = build_source_diagram(extracted, output_format)
        assert diagram
        for number in range(1, 26):
            assert f"SIC 2.0-{number:02d}" in diagram


def test_enrichment_replaces_sampled_ai_cards_with_complete_source_cards():
    extracted = extract_source_coverage(FIXTURE.read_text(encoding="utf-8"))
    sampled = {
        "title": "Sampled response",
        "format": "presentation",
        "content": "## Overview\n\nA short model response.",
        "cards": [{"title": "Sample only", "body": "Eight rows"}],
        "table": None,
        "mermaid": None,
        "mode": "ai",
    }
    enriched = enrich_result_with_coverage(
        sampled,
        extracted,
        {"format": "presentation", "detail": "detailed", "language": "English"},
    )
    assert len(enriched["cards"]) == 25
    assert len(enriched["source_table"]["rows"]) == 25
    for number in range(1, 26):
        assert f"SIC 2.0-{number:02d}" in enriched["content"]


def test_every_export_card_body_keeps_each_source_fact():
    extracted = extract_source_coverage(FIXTURE.read_text(encoding="utf-8"))
    cards = build_source_cards(extracted, "infographic")
    assert len(cards) == 25
    assert "AI Technologies" in cards[0]["body"] or "AI technologies" in cards[0]["body"]
    assert "AI Skill Development Roadmap Generator" in cards[-1]["title"]
