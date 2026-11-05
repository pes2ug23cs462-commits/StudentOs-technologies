"""
Document Parser for StudentOS RAG Study Assistant.

Extracts text from PDF, DOCX, and TXT files:
- PDF: Page-by-page extraction via PyMuPDF with 1-indexed page numbers.
- DOCX: Paragraph-based extraction via python-docx with None page numbers.
- TXT: UTF-8 decoded text extraction with None page numbers.

Rejects unsupported extensions, corrupted files, empty documents,
and scanned PDFs without extractable text (<50 meaningful characters).
Never logs document text or sensitive contents.
"""

from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Optional, Union

import docx
import pymupdf

logger = logging.getLogger("studentos.rag.parser")

MIN_EXTRACTED_CHARS = 50
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


class DocumentParsingError(Exception):
    """Base exception for document parsing failures."""
    pass


class UnsupportedFormatError(DocumentParsingError):
    """Raised when file extension or content type is not supported."""
    pass


class CorruptedFileError(DocumentParsingError):
    """Raised when the document file cannot be read, decoded, or parsed."""
    pass


class EmptyDocumentError(DocumentParsingError):
    """Raised when document contains fewer than the minimum required characters."""
    pass


class ScannedDocumentError(EmptyDocumentError):
    """Raised when a PDF contains no extractable digital text (e.g., scanned image)."""
    pass


@dataclass(frozen=True)
class ExtractedPage:
    """Represents text extracted from a document page or segment."""
    page_number: Optional[int]  # 1-indexed integer for PDF; None for DOCX and TXT
    text: str


@dataclass(frozen=True)
class ParsedDocument:
    """Represents a fully parsed document ready for chunking."""
    filename: str
    extension: str
    total_characters: int
    pages: list[ExtractedPage]


def normalize_whitespace(text: str) -> str:
    """
    Normalize whitespace while preserving paragraph boundaries:
    - Normalizes line endings to LF (\\n).
    - Replaces non-breaking spaces and tabs with standard spaces.
    - Collapses multiple horizontal spaces into a single space per line.
    - Collapses 3 or more consecutive newlines into 2 (paragraph boundary).
    - Trims leading and trailing whitespace.
    """
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\t", " ").replace("\xa0", " ")
    lines = [re.sub(r" {2,}", " ", line).strip() for line in text.split("\n")]
    rejoined = "\n".join(lines)
    rejoined = re.sub(r"\n{3,}", "\n\n", rejoined)
    return rejoined.strip()


def parse_document(
    source: Union[str, Path, bytes, BinaryIO],
    filename: Optional[str] = None,
) -> ParsedDocument:
    """
    Parse a study document from a file path, raw bytes, or binary stream.

    Parameters:
        source: File path (str/Path), file bytes, or file-like stream.
        filename: Original file name. Required if source is bytes or stream;
                  optional if source is a file path.

    Returns:
        ParsedDocument containing page-level extracted text and metadata.

    Raises:
        UnsupportedFormatError: If file extension is not .pdf, .docx, or .txt.
        CorruptedFileError: If file is malformed, unreadable, or not valid UTF-8.
        ScannedDocumentError: If PDF has pages but 0 extractable characters.
        EmptyDocumentError: If total meaningful text is under 50 characters.
    """
    # 1. Resolve filename and content bytes
    if isinstance(source, (str, Path)):
        file_path = Path(source)
        resolved_filename = filename or file_path.name
        if not file_path.is_file():
            logger.warning("Document file not found: %s", resolved_filename)
            raise CorruptedFileError(f"Document file not found: {resolved_filename}")
        try:
            content_bytes = file_path.read_bytes()
        except Exception as e:
            logger.warning("Failed to read file from disk '%s': %s", resolved_filename, type(e).__name__)
            raise CorruptedFileError(f"Failed to read document from disk: {type(e).__name__}") from e
    elif isinstance(source, bytes):
        if not filename:
            raise ValueError("filename is required when source is provided as bytes")
        resolved_filename = filename
        content_bytes = source
    else:
        # File-like stream
        if not filename:
            raise ValueError("filename is required when source is provided as a stream")
        resolved_filename = filename
        try:
            content_bytes = source.read()
        except Exception as e:
            logger.warning("Failed to read stream for '%s': %s", resolved_filename, type(e).__name__)
            raise CorruptedFileError(f"Failed to read document stream: {type(e).__name__}") from e

    # 2. Check extension
    extension = Path(resolved_filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        logger.warning("Rejected unsupported file format: %s", extension)
        raise UnsupportedFormatError(
            f"Unsupported file format '{extension}'. Allowed formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )

    # 3. Format-specific extraction
    if extension == ".pdf":
        pages = _parse_pdf(content_bytes, resolved_filename)
    elif extension == ".docx":
        pages = _parse_docx(content_bytes, resolved_filename)
    elif extension == ".txt":
        pages = _parse_txt(content_bytes, resolved_filename)
    else:
        raise UnsupportedFormatError(f"Unsupported format '{extension}'.")

    # 4. Total character evaluation
    total_chars = sum(len(p.text) for p in pages)
    logger.info(
        "Successfully parsed document: filename='%s', pages=%d, total_chars=%d",
        resolved_filename,
        len(pages),
        total_chars,
    )
    return ParsedDocument(
        filename=resolved_filename,
        extension=extension,
        total_characters=total_chars,
        pages=pages,
    )


def _parse_pdf(content_bytes: bytes, filename: str) -> list[ExtractedPage]:
    try:
        doc = pymupdf.open(stream=content_bytes, filetype="pdf")
    except Exception as e:
        logger.warning("Corrupted PDF rejected: '%s' (%s)", filename, type(e).__name__)
        raise CorruptedFileError(f"Corrupted or invalid PDF file: {type(e).__name__}") from e

    try:
        total_pages = len(doc)
        if total_pages == 0:
            logger.warning("Empty PDF document with 0 pages: '%s'", filename)
            raise EmptyDocumentError(f"PDF document '{filename}' contains 0 pages.")

        pages: list[ExtractedPage] = []

        for page_idx in range(total_pages):
            page_num = page_idx + 1  # 1-indexed human-readable integer
            try:
                page = doc[page_idx]
                raw_text = page.get_text("text") or ""
            except Exception as e:
                logger.warning("Failed extracting page %d of '%s': %s", page_num, filename, type(e).__name__)
                raise CorruptedFileError(f"Failed reading page {page_num}: {type(e).__name__}") from e

            normalized = normalize_whitespace(raw_text)
            if normalized:
                pages.append(ExtractedPage(page_number=page_num, text=normalized))
    finally:
        doc.close()

    total_chars = sum(len(p.text) for p in pages)

    # Scanned PDF check (0 extractable characters across all pages)
    if total_chars == 0:
        logger.warning("Scanned PDF detected with 0 selectable characters: '%s'", filename)
        raise ScannedDocumentError(
            f"PDF '{filename}' contains no selectable text (scanned or image-only). OCR is not supported."
        )

    # Insufficient content check (< 50 characters)
    if total_chars < MIN_EXTRACTED_CHARS:
        logger.warning("PDF '%s' has insufficient text (%d chars < %d)", filename, total_chars, MIN_EXTRACTED_CHARS)
        raise EmptyDocumentError(
            f"PDF '{filename}' contains only {total_chars} characters; minimum required is {MIN_EXTRACTED_CHARS}."
        )

    return pages


def _parse_docx(content_bytes: bytes, filename: str) -> list[ExtractedPage]:
    try:
        doc = docx.Document(io.BytesIO(content_bytes))
    except Exception as e:
        logger.warning("Corrupted DOCX rejected: '%s' (%s)", filename, type(e).__name__)
        raise CorruptedFileError(f"Corrupted or invalid DOCX file: {type(e).__name__}") from e

    try:
        paragraphs: list[str] = []
        for p in doc.paragraphs:
            if p.text and p.text.strip():
                paragraphs.append(p.text.strip())

        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text and c.text.strip()]
                if cells:
                    deduped: list[str] = []
                    for c in cells:
                        if not deduped or c != deduped[-1]:
                            deduped.append(c)
                    if deduped:
                        paragraphs.append(" | ".join(deduped))

        raw_text = "\n\n".join(paragraphs)
        normalized = normalize_whitespace(raw_text)
        total_chars = len(normalized)

        if total_chars < MIN_EXTRACTED_CHARS:
            logger.warning("DOCX '%s' has insufficient text (%d chars < %d)", filename, total_chars, MIN_EXTRACTED_CHARS)
            raise EmptyDocumentError(
                f"DOCX '{filename}' contains only {total_chars} characters; minimum required is {MIN_EXTRACTED_CHARS}."
            )

        # DOCX page numbers are None
        return [ExtractedPage(page_number=None, text=normalized)]
    except EmptyDocumentError:
        raise
    except Exception as e:
        logger.warning("Error reading DOCX structure '%s': %s", filename, type(e).__name__)
        raise CorruptedFileError(f"Failed to parse DOCX contents: {type(e).__name__}") from e


def _parse_txt(content_bytes: bytes, filename: str) -> list[ExtractedPage]:
    try:
        raw_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError as e:
        logger.warning("TXT UTF-8 decoding failed for '%s': %s", filename, type(e).__name__)
        raise CorruptedFileError(f"TXT document '{filename}' is not valid UTF-8 text.") from e

    normalized = normalize_whitespace(raw_text)
    total_chars = len(normalized)

    if total_chars < MIN_EXTRACTED_CHARS:
        logger.warning("TXT '%s' has insufficient text (%d chars < %d)", filename, total_chars, MIN_EXTRACTED_CHARS)
        raise EmptyDocumentError(
            f"TXT '{filename}' contains only {total_chars} characters; minimum required is {MIN_EXTRACTED_CHARS}."
        )

    # TXT page numbers are None
    return [ExtractedPage(page_number=None, text=normalized)]
