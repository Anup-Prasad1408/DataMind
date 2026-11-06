from io import BytesIO
from pathlib import Path

from docx import Document
from pypdf import PdfReader
from fastapi import UploadFile


async def extract_document(file: UploadFile, max_bytes: int, max_chars: int) -> tuple[str, str]:
    filename = Path(file.filename or "upload").name
    suffix = Path(filename).suffix.lower()
    allowed = {".txt", ".md", ".markdown", ".pdf", ".docx"}
    if suffix not in allowed:
        raise ValueError("Unsupported file type. Upload PDF, DOCX, TXT or MD.")

    raw = await file.read(max_bytes + 1)
    if not raw:
        raise ValueError("The uploaded file is empty.")
    if len(raw) > max_bytes:
        raise ValueError(f"File is too large. Maximum upload size is {max_bytes // (1024 * 1024)} MB.")

    try:
        if suffix in {".txt", ".md", ".markdown"}:
            text = raw.decode("utf-8-sig", errors="replace")
        elif suffix == ".pdf":
            reader = PdfReader(BytesIO(raw))
            if reader.is_encrypted:
                raise ValueError("Password-protected PDFs are not supported.")
            chunks = []
            for page in reader.pages:
                try:
                    # Layout mode helps retain columns and project-table rows.
                    extracted = page.extract_text(extraction_mode="layout") or ""
                except TypeError:
                    extracted = page.extract_text() or ""
                chunks.append(extracted)
            text = "\n\n".join(chunks)
        else:
            doc = Document(BytesIO(raw))
            blocks = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    blocks.append(" | ".join(cell.text for cell in row.cells))
            text = "\n\n".join(blocks)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Could not read this document. Check that it is a valid PDF/DOCX/TXT/MD file.") from exc

    text = text.strip()
    if not text:
        raise ValueError("No readable text was found in this document. Scanned PDFs need OCR, which is not enabled.")
    if len(text) > max_chars:
        text = text[:max_chars]
    return text, filename
