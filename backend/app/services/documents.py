from io import BytesIO
from pathlib import Path

from docx import Document
from fastapi import UploadFile
from pypdf import PdfReader

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}


async def extract_document(file: UploadFile, max_bytes: int, max_chars: int) -> tuple[str, str]:
    filename = file.filename or "uploaded-file"
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.")
    raw = await file.read(max_bytes + 1)
    if not raw:
        raise ValueError("The uploaded file is empty.")
    if len(raw) > max_bytes:
        raise ValueError(f"File is too large. Maximum upload size is {max_bytes // (1024 * 1024)} MB.")

    if extension in {".txt", ".md"}:
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("cp1252", errors="replace")
    elif extension == ".pdf":
        try:
            reader = PdfReader(BytesIO(raw))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise ValueError("Could not read this PDF. Check that it is a valid, text-based PDF.") from exc
    else:
        try:
            document = Document(BytesIO(raw))
            paragraphs = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
            table_rows = [" | ".join(cell.text for cell in row.cells) for table in document.tables for row in table.rows]
            text = "\n".join(paragraphs + table_rows)
        except Exception as exc:
            raise ValueError("Could not read this DOCX file. Please check that it is a valid Word document.") from exc

    text = text.strip()
    if not text:
        raise ValueError("No readable text was found. Scanned/image-only PDFs are not supported in this MVP.")
    if len(text) > max_chars:
        text = text[:max_chars]
    return text, filename
