from app.services.source_coverage import extract_source_coverage


def _table(count: int) -> str:
    rows = [
        "This collection lists 25 Samsung-based AI capstone projects across several domains.",
        "| Domain | Project ID | Real Problem | Use-Case | AI Technologies |",
        "|---|---|---|---|---|",
    ]
    for index in range(1, count + 1):
        rows.append(
            f"| Domain {index} | SIC 20-{index:02d} | Problem {index} | Use case {index} | ML, NLP {index} |"
        )
    return "\n".join(rows)


def test_all_25_source_rows_are_extracted_without_sampling():
    extracted = extract_source_coverage(_table(25))
    assert len(extracted["source_items"]) == 25
    assert len(extracted["source_table"]["rows"]) == 25
    assert extracted["coverage"]["actual_count"] == 25
    assert extracted["coverage"]["expected_count"] == 25
    assert extracted["coverage"]["complete"] is True
    assert extracted["source_table"]["rows"][-1][1] == "SIC 20-25"


def test_missing_source_records_are_reported_not_fabricated():
    extracted = extract_source_coverage(_table(8))
    assert len(extracted["source_items"]) == 8
    assert extracted["coverage"]["expected_count"] == 25
    assert extracted["coverage"]["actual_count"] == 8
    assert extracted["coverage"]["missing_count"] == 17
    assert extracted["coverage"]["complete"] is False


def test_project_id_blocks_are_preserved_when_table_markdown_is_unavailable():
    source = """This document contains 3 projects.
Smart Home
SIC 20-01
Problem: inefficient appliance usage.
Use-case: energy saver.
Technologies: ML forecasting, IoT.
Mobile
SIC 20-02
Problem: users need intelligent phone automation.
Use-case: personal smartphone assistant.
Technologies: LLM, NLP.
Healthcare
SIC 20-03
Problem: poor sleep affects productivity.
Use-case: sleep pattern analysis.
Technologies: data analytics, ML."""
    extracted = extract_source_coverage(source)
    assert len(extracted["source_items"]) == 3
    assert [item["project_id"] for item in extracted["source_items"]] == [
        "SIC 20-01", "SIC 20-02", "SIC 20-03"
    ]
    assert extracted["coverage"]["complete"] is True


def test_local_fallback_written_breakdown_keeps_all_25_source_rows():
    from app.services.demo import build_demo

    source = _table(25)
    result = build_demo(source, {"format": "structured_notes", "detail": "detailed", "language": "English"})
    assert "Complete source register" in result["content"]
    assert "SIC 20-01" in result["content"]
    assert "SIC 20-25" in result["content"]


def test_docx_style_pipe_table_without_markdown_separator_is_detected():
    source = "\n".join([
        "Collection of 3 projects.",
        "Domain | Project ID | Real Problem | Use-Case | AI Technologies",
        "Smart Home | SIC 20-01 | Inefficient appliance usage | Energy saving | ML, IoT",
        "Mobile | SIC 20-02 | Repetitive phone tasks | Personal assistant | LLM, NLP",
        "Healthcare | SIC 20-03 | Poor sleep quality | Sleep analysis | Data analytics, ML",
    ])
    extracted = extract_source_coverage(source)
    assert extracted["source_table"] is not None
    assert len(extracted["source_table"]["rows"]) == 3
    assert extracted["source_table"]["rows"][2][1] == "SIC 20-03"
