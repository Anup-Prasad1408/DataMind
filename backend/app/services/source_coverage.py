"""Extract source records before AI generation so the model cannot silently sample them.

This module deliberately does not infer missing project facts. It preserves table
rows, numbered items, and project-ID sections found in the uploaded/pasted text.
"""
from __future__ import annotations

import re
from typing import Any

_PROJECT_ID_RE = re.compile(
    r"\b([A-Z]{2,10}\s*[-–]?\s*\d{2,4}\s*[-–]\s*\d{1,4})\b",
    re.IGNORECASE,
)
_EXPECTED_RE = re.compile(
    r"\b(\d{1,3})\s+(?:[A-Za-z][A-Za-z-]*\s+){0,5}(?:projects?|items?|records?|entries|case studies)\b",
    re.IGNORECASE,
)


def _clean_cell(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    return value.strip(" `\t")


def _split_pipe_row(line: str) -> list[str]:
    return [_clean_cell(cell) for cell in line.strip().strip("|").split("|")]


def _is_separator_row(line: str) -> bool:
    cells = _split_pipe_row(line)
    return bool(cells) and all(
        re.fullmatch(r":?-{2,}:?", cell.replace(" ", ""))
        for cell in cells
    )


def _extract_markdown_table(text: str) -> dict[str, Any] | None:
    """Extract Markdown or DOCX-style pipe tables, with or without separator rows."""
    lines = text.splitlines()
    candidates: list[dict[str, Any]] = []
    i = 0
    while i < len(lines):
        if "|" not in lines[i]:
            i += 1
            continue
        j = i
        pipe_lines: list[str] = []
        while j < len(lines) and "|" in lines[j] and lines[j].strip():
            pipe_lines.append(lines[j].strip())
            j += 1
        if len(pipe_lines) < 3:
            i = max(j, i + 1)
            continue
        headers = _split_pipe_row(pipe_lines[0])
        data_lines = pipe_lines[1:]
        if data_lines and _is_separator_row(data_lines[0]):
            data_lines = data_lines[1:]
        rows: list[list[str]] = []
        for line in data_lines:
            if _is_separator_row(line):
                continue
            cells = _split_pipe_row(line)
            if len(cells) < 2:
                continue
            if len(cells) < len(headers):
                cells += [""] * (len(headers) - len(cells))
            elif len(cells) > len(headers):
                cells = cells[: len(headers) - 1] + [" | ".join(cells[len(headers) - 1 :])]
            rows.append(cells)
        meaningful_headers = " ".join(headers).lower()
        if rows and (
            any(term in meaningful_headers for term in ("project", "domain", "use-case", "use case", "problem", "technology", "id"))
            or len(rows) >= 3
        ):
            candidates.append({"headers": headers, "rows": rows})
        i = max(j, i + 1)
    if not candidates:
        return None
    return max(candidates, key=lambda item: len(item["rows"]))


def _extract_project_id_records(text: str) -> list[dict[str, Any]]:
    matches = list(_PROJECT_ID_RE.finditer(text))
    if not matches:
        return []
    records: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        start = match.start()
        line_start = text.rfind("\n", 0, start) + 1
        previous_end = max(0, line_start - 1)
        previous_start = text.rfind("\n", 0, previous_end) + 1 if previous_end else 0
        previous_line = text[previous_start:previous_end].strip() if previous_end else ""
        # Domain labels are frequently laid out immediately above the project ID in PDFs.
        if previous_line and len(previous_line) <= 80 and not _PROJECT_ID_RE.search(previous_line):
            start = previous_start
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        segment = text[start:end]
        # Stop at a note/next section rather than swallowing the whole remainder.
        segment = re.split(r"\n\s*(?:Note|References|Appendix)\s*:", segment, maxsplit=1, flags=re.IGNORECASE)[0]
        segment = re.sub(r"\s+", " ", segment).strip(" |\t\n")
        if not segment:
            continue
        project_id = _clean_cell(match.group(1)).replace("  ", " ")
        records.append({"label": project_id, "details": segment, "project_id": project_id})
    # De-duplicate exact repeated IDs from headers/page footers.
    unique: dict[str, dict[str, Any]] = {}
    for record in records:
        key = re.sub(r"\s+", "", record["project_id"]).upper()
        if key not in unique or len(record["details"]) > len(unique[key]["details"]):
            unique[key] = record
    return list(unique.values())


def _extract_numbered_items(text: str) -> list[dict[str, Any]]:
    lines = text.splitlines()
    records: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    starter = re.compile(r"^\s*(?:(\d{1,3})[.)]|[-*•▪◦])\s+(.+?)\s*$")
    for line in lines:
        match = starter.match(line)
        if match:
            if current:
                records.append(current)
            number, body = match.groups()
            current = {
                "label": f"Item {number}" if number else f"Item {len(records) + 1}",
                "details": _clean_cell(body),
            }
        elif current and line.strip():
            current["details"] += " " + _clean_cell(line)
    if current:
        records.append(current)
    # Exclude tiny list markers and overly generic extraction noise.
    return [r for r in records if len(r.get("details", "")) > 12]


def _expected_count(text: str) -> int | None:
    matches = [int(m.group(1)) for m in _EXPECTED_RE.finditer(text)]
    # Prefer the largest explicit count; this avoids matching e.g. "2 use cases"
    # when the source also clearly states "25 projects".
    return max(matches) if matches else None


def extract_source_coverage(text: str) -> dict[str, Any]:
    """Return extracted complete rows/items and an explicit completeness report."""
    source_table = _extract_markdown_table(text)
    source_items: list[dict[str, Any]] = []

    if source_table:
        headers = source_table["headers"]
        for index, cells in enumerate(source_table["rows"], 1):
            values = {headers[i]: cells[i] for i in range(min(len(headers), len(cells)))}
            project_id = next(
                (value for key, value in values.items() if "id" in key.lower() and value),
                "",
            )
            label = project_id or next((v for v in cells if v), f"Item {index}")
            source_items.append({
                "index": index,
                "label": label,
                "project_id": project_id,
                "fields": values,
                "details": " | ".join(f"{key}: {value}" for key, value in values.items() if value),
            })
    else:
        source_items = _extract_project_id_records(text)
        if not source_items:
            source_items = _extract_numbered_items(text)
        for index, item in enumerate(source_items, 1):
            item.setdefault("index", index)
            item.setdefault("fields", {})

    expected = _expected_count(text)
    actual = len(source_items)
    # If the source explicitly says 25 but only 8 records appear in extracted text,
    # never fabricate the other 17. The UI can tell the user exactly what is missing.
    reported_expected = expected if expected is not None else actual
    missing = max(0, reported_expected - actual) if expected is not None else 0
    coverage = {
        "trackable": (expected is not None or actual > 0),
        "expected_count": reported_expected,
        "actual_count": actual,
        "missing_count": missing,
        "complete": (missing == 0) if expected is not None else True,
        "source_count_was_explicit": expected is not None,
        "warning": (
            f"The source refers to {reported_expected} items, but only {actual} complete item(s) were extractable. "
            f"The remaining {missing} item(s) are not present in the extracted text, so DataMind will not invent them. "
            "Re-upload the complete source document or paste the missing entries."
            if missing else "All extractable source items are preserved in the result."
        ),
    }
    return {
        "source_items": source_items,
        "source_table": source_table,
        "coverage": coverage,
    }


def format_records_for_prompt(coverage_data: dict[str, Any]) -> str:
    """Compact representation of all detected records for the model prompt."""
    table = coverage_data.get("source_table")
    if table:
        headers = table["headers"]
        lines = [" | ".join(headers)]
        lines.extend(" | ".join(row) for row in table["rows"])
        return "\n".join(lines)
    records = coverage_data.get("source_items") or []
    return "\n".join(
        f"{item.get('label', f'Item {index + 1}')}: {item.get('details', '')}"
        for index, item in enumerate(records)
    )
