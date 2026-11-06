"""Source-preserving extraction and deterministic completeness enrichment.

The AI model is never the source of truth for row counts. Records are extracted
locally, attached to every result, and rendered independently from model prose.
Supports Markdown/pipe tables, PDF layout-mode fixed-width tables, project IDs,
and numbered/bulleted records.
"""
from __future__ import annotations

import re
import unicodedata
from collections import Counter, defaultdict
from typing import Any

_PROJECT_ID_RE = re.compile(
    r"(?<![A-Za-z0-9])([A-Z]{2,10}\s*(?:\d{1,2}\.\d{1,2}|\d{2,4})\s*[-–]\s*\d{1,4})(?!\w)",
    re.IGNORECASE,
)
_EXPECTED_RE = re.compile(
    r"\b(\d{1,3})\s+(?:[A-Za-z][A-Za-z-]*\s+){0,5}(?:projects?|items?|records?|entries|case studies)\b",
    re.IGNORECASE,
)
_FIXED_HEADERS = [
    "Sr.No",
    "Project ID",
    "Domain",
    "Samsung-Based AI Capstone Project",
    "Real Problem Use Case",
    "AI Technologies",
]


def _normalise_text(value: str) -> str:
    # NFKC repairs common PDF ligatures such as ﬁ, ﬃ and ﬀ.
    return unicodedata.normalize("NFKC", str(value or ""))


def _clean_cell(value: str) -> str:
    value = _normalise_text(value)
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
    """Extract Markdown / DOCX pipe tables with or without separator rows."""
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
        if rows and any(
            term in meaningful_headers
            for term in ("project", "domain", "use-case", "use case", "problem", "technology", "id")
        ):
            candidates.append({"headers": headers, "rows": rows})
        i = max(j, i + 1)
    return max(candidates, key=lambda item: len(item["rows"])) if candidates else None


def _extract_fixed_width_project_table(text: str) -> dict[str, Any] | None:
    """Extract PDF layout tables by using the column starts in their header row.

    pypdf's extraction_mode='layout' retains column geometry as spaces. A normal
    whitespace split destroys cells such as "Consumer Electronics" and long titles.
    Header-based slices preserve the six source columns without OCR or guessing.
    """
    lines = _normalise_text(text).splitlines()
    header_index = None
    header_line = ""
    for index, line in enumerate(lines):
        low = line.lower()
        if all(token in low for token in ("project id", "domain", "samsung-based", "ai technologies")):
            header_index = index
            header_line = line
            break
    if header_index is None:
        return None

    anchors = [
        ("Sr.No", ("sr.no", "sr no", "s.no")),
        ("Project ID", ("project id",)),
        ("Domain", ("domain",)),
        ("Samsung-Based AI Capstone Project", ("samsung-based",)),
        ("Real Problem Use Case", ("real problem",)),
        ("AI Technologies", ("ai technologies",)),
    ]
    lower = header_line.lower()
    starts: list[int] = []
    for _, variants in anchors:
        position = next((lower.find(variant) for variant in variants if lower.find(variant) >= 0), -1)
        if position < 0:
            return None
        starts.append(position)
    if starts != sorted(starts) or len(set(starts)) != len(starts):
        return None

    row_pattern = re.compile(r"^\s*(\d{1,3})\s+SIC\s+(?:\d{1,2}\.\d{1,2}|\d{2,4})\s*[-–]\s*\d{1,4}\b", re.I)
    rows: list[list[str]] = []
    for line in lines[header_index + 1 :]:
        if not row_pattern.match(line):
            continue
        padded = line.ljust(starts[-1] + 1)
        ends = starts[1:] + [len(padded)]
        cells = [_clean_cell(padded[start:end]) for start, end in zip(starts, ends)]
        if len(cells) != 6 or not cells[1]:
            continue
        # If a PDF text extractor shifts one of the final boundaries, keep the
        # complete technology string in the final cell rather than dropping text.
        rows.append(cells)

    # Do not accept a false-positive header that only finds a couple of unrelated IDs.
    if not rows:
        return None
    return {"headers": _FIXED_HEADERS.copy(), "rows": rows, "extraction_method": "pdf-layout-columns"}


def _extract_project_id_records(text: str) -> list[dict[str, Any]]:
    normalised = _normalise_text(text)
    matches = list(_PROJECT_ID_RE.finditer(normalised))
    if not matches:
        return []
    records: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        start = match.start()
        line_start = normalised.rfind("\n", 0, start) + 1
        previous_end = max(0, line_start - 1)
        previous_start = normalised.rfind("\n", 0, previous_end) + 1 if previous_end else 0
        previous_line = normalised[previous_start:previous_end].strip() if previous_end else ""
        if previous_line and len(previous_line) <= 80 and not _PROJECT_ID_RE.search(previous_line):
            start = previous_start
        end = matches[index + 1].start() if index + 1 < len(matches) else len(normalised)
        segment = normalised[start:end]
        segment = re.split(r"\n\s*(?:Note|References|Appendix)\s*:", segment, maxsplit=1, flags=re.I)[0]
        segment = re.sub(r"\s+", " ", segment).strip(" |\t\n")
        if not segment:
            continue
        project_id = _clean_cell(match.group(1))
        records.append({"label": project_id, "details": segment, "project_id": project_id})
    unique: dict[str, dict[str, Any]] = {}
    for record in records:
        key = re.sub(r"\s+", "", record["project_id"]).upper()
        if key not in unique or len(record["details"]) > len(unique[key]["details"]):
            unique[key] = record
    return list(unique.values())


def _extract_numbered_items(text: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    starter = re.compile(r"^\s*(?:(\d{1,3})[.)]|[-*•▪◦])\s+(.+?)\s*$")
    for line in _normalise_text(text).splitlines():
        match = starter.match(line)
        if match:
            if current:
                records.append(current)
            number, body = match.groups()
            current = {"label": f"Item {number}" if number else f"Item {len(records) + 1}", "details": _clean_cell(body)}
        elif current and line.strip():
            current["details"] += " " + _clean_cell(line)
    if current:
        records.append(current)
    return [item for item in records if len(item.get("details", "")) > 12]


def _expected_count(text: str) -> int | None:
    matches = [int(match.group(1)) for match in _EXPECTED_RE.finditer(_normalise_text(text))]
    return max(matches) if matches else None


def _items_from_table(table: dict[str, Any]) -> list[dict[str, Any]]:
    headers = table["headers"]
    records = []
    for index, cells in enumerate(table["rows"], 1):
        values = {headers[i]: cells[i] for i in range(min(len(headers), len(cells)))}
        project_id = next((value for key, value in values.items() if "id" in key.lower() and value), "")
        label = project_id or next((value for value in cells if value), f"Item {index}")
        records.append({
            "index": index,
            "label": label,
            "project_id": project_id,
            "fields": values,
            "details": " | ".join(f"{key}: {value}" for key, value in values.items() if value),
        })
    return records


def extract_source_coverage(text: str) -> dict[str, Any]:
    """Extract and count all readable records before the model is called."""
    normalised = _normalise_text(text)
    source_table = _extract_markdown_table(normalised)
    if source_table is None:
        source_table = _extract_fixed_width_project_table(normalised)

    if source_table:
        source_items = _items_from_table(source_table)
    else:
        source_items = _extract_project_id_records(normalised)
        if not source_items:
            source_items = _extract_numbered_items(normalised)
        for index, item in enumerate(source_items, 1):
            item.setdefault("index", index)
            item.setdefault("fields", {})

    expected = _expected_count(normalised)
    actual = len(source_items)
    reported_expected = max(expected or 0, actual)
    missing = max(0, reported_expected - actual) if expected is not None else 0
    coverage = {
        "trackable": expected is not None or actual > 0,
        "expected_count": reported_expected,
        "actual_count": actual,
        "missing_count": missing,
        "complete": missing == 0,
        "source_count_was_explicit": expected is not None,
        "extraction_method": source_table.get("extraction_method", "pipe-table") if source_table else "project-id-or-list" if source_items else "plain-text",
        "warning": (
            f"The source refers to {reported_expected} items, but only {actual} complete item(s) were extractable. "
            f"The remaining {missing} item(s) are not present in the extracted text. Re-upload the full selectable-text document."
            if missing else f"All {actual} extractable source record(s) are preserved in the result."
        ),
    }
    return {"source_items": source_items, "source_table": source_table, "coverage": coverage}


def format_records_for_prompt(coverage_data: dict[str, Any]) -> str:
    """Compact, loss-minimizing representation for the AI prompt."""
    table = coverage_data.get("source_table")
    if table:
        lines = [" | ".join(table["headers"])]
        lines.extend(" | ".join(_clean_cell(cell) for cell in row) for row in table["rows"])
        return "\n".join(lines)
    records = coverage_data.get("source_items") or []
    return "\n".join(f"{item.get('label', f'Item {index + 1}')}: {item.get('details', '')}" for index, item in enumerate(records))


def _field(fields: dict[str, Any], *needles: str) -> str:
    for key, value in fields.items():
        key_lower = key.lower()
        if any(needle in key_lower for needle in needles) and str(value).strip():
            return _clean_cell(str(value))
    return "Not specified in source"


def _suggested_build_focus(technologies: str) -> str:
    """Offer a clearly-labelled engineering direction based only on listed tech tags."""
    tech = technologies.lower()
    if any(term in tech for term in ("computer vision", "cnn", "deep learning")):
        return "Suggested build focus: collect and label representative images, prepare a train/validation/test split, compare a baseline vision model, evaluate precision/recall, and provide a human-review path for low-confidence predictions."
    if any(term in tech for term in ("speech recognition", "voice-to-text", "speech")):
        return "Suggested build focus: create a consented speech test set, handle noise and accents, produce timestamped transcripts, measure word-error rate, and make correction easy for the user."
    if any(term in tech for term in ("rag", "llm", "knowledge base")):
        return "Suggested build focus: curate trusted documents, chunk and embed them, retrieve relevant evidence, generate grounded responses with source references, and test retrieval quality."
    if any(term in tech for term in ("time series", "forecast", "iot", "sensor", "prediction")):
        return "Suggested build focus: collect time-stamped readings, validate missing/outlier values, create temporal features, evaluate on held-out time windows, and present forecasts or alerts with confidence."
    if any(term in tech for term in ("recommendation", "personalization", "gen ai")):
        return "Suggested build focus: capture user goals/preferences and feedback, establish a baseline ranking method, explain recommendations, and evaluate relevance using repeatable test cases."
    if any(term in tech for term in ("anomaly", "predictive maintenance")):
        return "Suggested build focus: establish normal-behaviour baselines, label known fault/anomaly examples where available, score deviations, measure false alarms, and monitor drift."
    if any(term in tech for term in ("nlp", "classification", "document ai")):
        return "Suggested build focus: prepare representative labelled examples, normalize text/documents, build a baseline classifier or extractor, measure precision/recall, and review uncertain predictions."
    if any(term in tech for term in ("optimization", "analytics", "clustering")):
        return "Suggested build focus: define measurable objectives and constraints, build a baseline from the available data, compare alternatives, and validate improvements against clear KPIs."
    if "machine learning" in tech or " ml" in f" {tech}":
        return "Suggested build focus: define the target and data schema, build a simple baseline, split data without leakage, compare suitable models, and report metrics with error analysis."
    return "Suggested build focus: define the user workflow, document required inputs and outputs, create a measurable baseline, test representative scenarios, and record limitations."


def _record_view(item: dict[str, Any]) -> dict[str, str]:
    fields = item.get("fields") or {}
    if fields:
        return {
            "serial": _field(fields, "sr.no", "sr no", "serial"),
            "project_id": _field(fields, "project id", "id"),
            "domain": _field(fields, "domain"),
            "title": _field(fields, "samsung-based", "capstone project", "project title", "project name"),
            "problem": _field(fields, "real problem", "problem", "use-case", "use case"),
            "technologies": _field(fields, "ai technologies", "technologies", "tech stack"),
        }
    details = _clean_cell(item.get("details", ""))
    return {
        "serial": str(item.get("index", "")),
        "project_id": _clean_cell(item.get("project_id") or item.get("label") or ""),
        "domain": "Not separately specified in source",
        "title": _clean_cell(item.get("label") or "Untitled source item"),
        "problem": details or "Not specified in source",
        "technologies": "Not separately specified in source",
    }


def build_detailed_source_appendix(coverage_data: dict[str, Any], detail: str = "detailed", language: str = "English") -> str:
    """Build a complete, deterministic project-by-project appendix from extracted facts."""
    records = coverage_data.get("source_items") or []
    if not records:
        return ""
    views = [_record_view(item) for item in records]
    counts = Counter(v["domain"] for v in views if v["domain"] not in {"", "Not specified in source", "Not separately specified in source"})

    if language == "Hindi":
        heading = "## Source se poori coverage"
        scope = f"DataMind ne source se **{len(views)}** record extract kiye. Neeche har record ke original fields preserve kiye gaye hain."
        domain_heading = "### Domain-wise distribution"
        item_heading = "### Har project ki complete details"
    elif language == "Hinglish":
        heading = "## Complete source coverage"
        scope = f"Source se **{len(views)}** records extract hue hain. Neeche har project ki original important lines preserve ki gayi hain."
        domain_heading = "### Domain-wise distribution"
        item_heading = "### Every project — complete details"
    else:
        heading = "## Complete source coverage and detailed project register"
        scope = f"DataMind extracted **{len(views)}** source record(s). Every available source row is reproduced below; recommendations are explicitly separated from source facts."
        domain_heading = "### Domain-wise distribution"
        item_heading = "### Complete project-by-project breakdown"

    lines = [heading, "", scope, ""]
    if counts:
        lines.extend([domain_heading, ""])
        lines.extend(f"- **{domain}:** {count} project(s)" for domain, count in sorted(counts.items()))
        lines.append("")
    lines.extend([item_heading, ""])
    for index, view in enumerate(views, 1):
        title = view["title"] if view["title"] != "Not specified in source" else (view["project_id"] or f"Source item {index}")
        identifier = view["project_id"]
        if identifier not in {"", "Not specified in source"}:
            title_line = f"### {index}. {title} ({identifier})"
        else:
            title_line = f"### {index}. {title}"
        lines.extend([
            title_line,
            f"- **Domain:** {view['domain']}",
            f"- **Real problem / use case:** {view['problem']}",
            f"- **AI technologies listed in source:** {view['technologies']}",
        ])
        if detail == "detailed":
            lines.append(f"- **{_suggested_build_focus(view['technologies'])}**")
        lines.append("")

    cov = coverage_data.get("coverage") or {}
    if cov.get("missing_count", 0):
        lines.extend([
            "### Extraction limitation",
            str(cov.get("warning") or "Some expected records were not extractable."),
            "",
        ])
    else:
        lines.extend(["### Coverage check", f"- Expected records: {cov.get('expected_count', len(views))}", f"- Extracted and preserved: {len(views)}", "- Missing records in extracted text: 0", ""])
    return "\n".join(lines).strip()


def build_source_cards(coverage_data: dict[str, Any], fmt: str) -> list[dict[str, str]]:
    """Build one card per source item for flashcards, infographics and presentations."""
    cards: list[dict[str, str]] = []
    for index, item in enumerate(coverage_data.get("source_items") or [], 1):
        view = _record_view(item)
        title = view["title"] if view["title"] != "Not specified in source" else view["project_id"] or f"Source item {index}"
        body = (
            f"Domain: {view['domain']}\n"
            f"Problem / use case: {view['problem']}\n"
            f"AI technologies: {view['technologies']}"
        )
        if fmt == "flashcards":
            cards.append({
                "question": f"What is {title} ({view['project_id']}) designed to address?" if view["project_id"] not in {"", "Not specified in source"} else f"What does {title} address?",
                "answer": body,
            })
        else:
            cards.append({"title": f"{view['project_id']} · {title}" if view["project_id"] not in {"", "Not specified in source"} else title, "body": body})
    return cards


def _mermaid_label(value: str, limit: int = 64) -> str:
    value = _normalise_text(value)
    value = re.sub(r"[\r\n]+", " ", value)
    value = value.replace('"', "'").replace("[", "(").replace("]", ")")
    value = re.sub(r"[{}<>`|]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value[:limit].rstrip() or "Untitled project"


def build_source_diagram(coverage_data: dict[str, Any], fmt: str) -> str | None:
    """Create diagrams that include every extracted source item, not an AI sample."""
    records = coverage_data.get("source_items") or []
    if not records:
        return None
    views = [_record_view(item) for item in records]
    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    for view in views:
        domain = view["domain"] if view["domain"] not in {"", "Not specified in source", "Not separately specified in source"} else "Uncategorised"
        groups[domain].append(view)

    if fmt == "mindmap":
        lines = ["mindmap", f"  root(({_mermaid_label(f'{len(views)} source projects', 40)}))"]
        for domain in sorted(groups):
            lines.append(f"    {_mermaid_label(domain, 35)}")
            for view in groups[domain]:
                label = f"{view['project_id']} · {view['title']}" if view["project_id"] not in {"", "Not specified in source"} else view["title"]
                lines.append(f"      {_mermaid_label(label, 58)}")
        return "\n".join(lines)

    if fmt == "timeline":
        lines = ["timeline", f"    title {_mermaid_label(f'Complete source inventory - {len(views)} projects', 60)}"]
        for domain in sorted(groups):
            lines.append(f"    section {_mermaid_label(domain, 40)}")
            for index, view in enumerate(groups[domain], 1):
                label = f"{view['project_id']} - {view['title']}" if view["project_id"] not in {"", "Not specified in source"} else view["title"]
                lines.append(f"      {index} : {_mermaid_label(label, 62)}")
        return "\n".join(lines)

    direction = "LR" if fmt == "workflow" else "TD"
    lines = [f"flowchart {direction}", f'  ROOT["Complete source inventory: {len(views)} projects"]']
    for group_index, domain in enumerate(sorted(groups), 1):
        group_id = f"D{group_index}"
        lines.append(f'  {group_id}["{_mermaid_label(domain, 42)} · {len(groups[domain])} projects"]')
        lines.append(f"  ROOT --> {group_id}")
        for item_index, view in enumerate(groups[domain], 1):
            project_node = f"P{group_index}_{item_index}"
            label = f"{view['project_id']} · {view['title']}" if view["project_id"] not in {"", "Not specified in source"} else view["title"]
            lines.append(f'  {project_node}["{_mermaid_label(label, 66)}"]')
            lines.append(f"  {group_id} --> {project_node}")
    return "\n".join(lines)


def enrich_result_with_coverage(result: dict[str, Any], coverage_data: dict[str, Any], options: dict[str, Any]) -> dict[str, Any]:
    """Attach authoritative source data and prevent short AI samples from hiding it."""
    fmt = options.get("format", result.get("format", "structured_notes"))
    detail = options.get("detail", "detailed")
    language = options.get("language", "English")
    items = coverage_data.get("source_items") or []
    table = coverage_data.get("source_table")
    result["source_items"] = items
    result["coverage"] = coverage_data.get("coverage") or {}
    if table:
        result["source_table"] = table
        if fmt == "comparison_table":
            result["table"] = table

    if items and fmt in {"flashcards", "infographic", "presentation"}:
        # The source list is authoritative: make one visual card for every item.
        result["cards"] = build_source_cards(coverage_data, fmt)
    if items and fmt in {"flowchart", "mindmap", "timeline", "workflow", "mermaid"}:
        result["mermaid"] = build_source_diagram(coverage_data, fmt)

    if items:
        content = str(result.get("content") or "").strip()
        # Replace an older abbreviated fallback register instead of printing it twice.
        content = re.split(r"\n##\s+(?:Complete source register|Complete source items|Complete source coverage)(?:[^\n]*)\n", content, maxsplit=1, flags=re.I)[0].rstrip()
        appendix = build_detailed_source_appendix(coverage_data, detail, language)
        if appendix:
            content = f"{content}\n\n{appendix}".strip()
        result["content"] = content or appendix
    return result


def coverage_from_result(result: dict[str, Any]) -> dict[str, Any]:
    """Rehydrate source coverage from a saved result during refine operations."""
    table = result.get("source_table")
    items = result.get("source_items") or []
    if table and not items:
        items = _items_from_table(table)
    return {
        "source_table": table,
        "source_items": items,
        "coverage": result.get("coverage") or {
            "trackable": bool(items), "expected_count": len(items),
            "actual_count": len(items), "missing_count": 0, "complete": True,
            "warning": f"All {len(items)} source records are preserved.",
        },
    }
