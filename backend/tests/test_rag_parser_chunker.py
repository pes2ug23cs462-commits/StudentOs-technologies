"""
Unit tests for StudentOS RAG Document Parser and Recursive Character Chunker.

Tests coverage:
- Valid PDF extraction with multiple pages.
- PDF page-number conversion (1-indexed).
- Valid DOCX extraction.
- Valid TXT extraction.
- Unsupported extension rejection.
- Empty document rejection (<50 chars).
- Corrupted document handling (PDF, DOCX, TXT).
- Scanned/empty-text PDF rejection.
- Chunk size and overlap behavior.
- Page metadata preservation.
- DOCX/TXT null page metadata.
- Deterministic chunk IDs.
- Short and long input handling.
- Avoid empty chunks.
- Overlap parameter validation.

Uses 100% synthetic in-memory test documents. No personal student data.
"""

import io
import pytest
import pymupdf
import docx

from app.rag.parser import (
    MIN_EXTRACTED_CHARS,
    CorruptedFileError,
    EmptyDocumentError,
    ParsedDocument,
    ScannedDocumentError,
    UnsupportedFormatError,
    normalize_whitespace,
    parse_document,
)
from app.rag.chunker import (
    DocumentChunk,
    chunk_document,
    chunk_text,
    make_chunk_id,
    split_text_recursive,
)


def _create_synthetic_pdf(pages_text: list[str]) -> bytes:
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        if text:
            page.insert_text((50, 50), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _create_synthetic_docx(paragraphs: list[str]) -> bytes:
    doc = docx.Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _create_synthetic_txt(text: str) -> bytes:
    return text.encode("utf-8")


# ============================================================================
# 1. PARSER TESTS
# ============================================================================

def test_parse_valid_multi_page_pdf():
    """Verify multi-page PDF extracts each page with 1-indexed page numbers."""
    page1_text = "This is synthetic page one text for the StudentOS PDF parser test suite."
    page2_text = "This is synthetic page two text detailing additional educational curriculum points."
    page3_text = "This is synthetic page three containing further comprehensive study materials."

    pdf_bytes = _create_synthetic_pdf([page1_text, page2_text, page3_text])
    parsed = parse_document(pdf_bytes, filename="lecture_notes.pdf")

    assert parsed.filename == "lecture_notes.pdf"
    assert parsed.extension == ".pdf"
    assert len(parsed.pages) == 3
    assert parsed.pages[0].page_number == 1
    assert parsed.pages[1].page_number == 2
    assert parsed.pages[2].page_number == 3
    assert "page one" in parsed.pages[0].text
    assert "page two" in parsed.pages[1].text
    assert "page three" in parsed.pages[2].text
    assert parsed.total_characters >= MIN_EXTRACTED_CHARS


def test_pdf_page_number_conversion():
    """Confirm PDF page numbering is strictly 1-indexed integers (not 0-indexed)."""
    pdf_bytes = _create_synthetic_pdf([
        "Page index zero becomes human-readable page number one in output metadata.",
        "Page index one becomes human-readable page number two in output metadata.",
    ])
    parsed = parse_document(pdf_bytes, filename="test_indexing.pdf")

    assert [p.page_number for p in parsed.pages] == [1, 2]
    assert all(isinstance(p.page_number, int) for p in parsed.pages)


def test_parse_valid_docx():
    """Verify DOCX extraction returns null page number and combines paragraphs."""
    paragraphs = [
        "First synthetic paragraph for StudentOS DOCX parser testing.",
        "Second synthetic paragraph containing essential study syllabus guidance.",
        "Third synthetic paragraph concluding the document with references.",
    ]
    docx_bytes = _create_synthetic_docx(paragraphs)
    parsed = parse_document(docx_bytes, filename="syllabus.docx")

    assert parsed.filename == "syllabus.docx"
    assert parsed.extension == ".docx"
    assert len(parsed.pages) == 1
    assert parsed.pages[0].page_number is None
    assert "First synthetic paragraph" in parsed.pages[0].text
    assert "Third synthetic paragraph" in parsed.pages[0].text
    assert parsed.total_characters >= MIN_EXTRACTED_CHARS


def test_parse_valid_txt():
    """Verify plain text UTF-8 extraction with null page number and normalized whitespace."""
    raw_text = (
        "  Header line of synthetic study notes.  \r\n\r\n\r\n"
        "Second line with\tmultiple    spaces and tabs.\n\n"
        "Third paragraph providing sufficient text to exceed fifty characters easily."
    )
    txt_bytes = _create_synthetic_txt(raw_text)
    parsed = parse_document(txt_bytes, filename="notes.txt")

    assert parsed.filename == "notes.txt"
    assert parsed.extension == ".txt"
    assert len(parsed.pages) == 1
    assert parsed.pages[0].page_number is None
    # Check normalization: \r\n removed, tabs converted, paragraph boundaries preserved
    assert "\r" not in parsed.pages[0].text
    assert "\t" not in parsed.pages[0].text
    assert "\n\n" in parsed.pages[0].text
    assert parsed.total_characters >= MIN_EXTRACTED_CHARS


def test_unsupported_extension_rejection():
    """Verify unsupported file extensions are rejected immediately."""
    dummy_bytes = b"Some arbitrary content for extension testing."

    unsupported_files = [
        "image.png",
        "photo.jpg",
        "archive.zip",
        "script.py",
        "document.doc",
        "spreadsheet.xlsx",
        "executable.exe",
    ]

    for fname in unsupported_files:
        with pytest.raises(UnsupportedFormatError) as exc_info:
            parse_document(dummy_bytes, filename=fname)
        assert "Unsupported file format" in str(exc_info.value)


def test_empty_document_rejection():
    """Reject documents with fewer than 50 meaningful characters."""
    too_short_text = "Only 20 characters."

    # TXT too short
    with pytest.raises(EmptyDocumentError) as exc_info:
        parse_document(_create_synthetic_txt(too_short_text), filename="short.txt")
    assert "minimum required is 50" in str(exc_info.value)

    # DOCX too short
    with pytest.raises(EmptyDocumentError) as exc_info:
        parse_document(_create_synthetic_docx([too_short_text]), filename="short.docx")
    assert "minimum required is 50" in str(exc_info.value)

    # Whitespace only
    with pytest.raises(EmptyDocumentError):
        parse_document(_create_synthetic_txt("   \n\n\t   "), filename="blank.txt")


def test_corrupted_document_handling():
    """Safely catch and raise CorruptedFileError on corrupted inputs."""
    corrupted_bytes = b"This is corrupted random data not matching any header format."

    with pytest.raises(CorruptedFileError):
        parse_document(corrupted_bytes, filename="corrupt.pdf")

    with pytest.raises(CorruptedFileError):
        parse_document(corrupted_bytes, filename="corrupt.docx")

    # Invalid non-UTF8 sequence for TXT
    invalid_utf8_bytes = b"\xff\xfe\x00\x00\x80\x81\xfe"
    with pytest.raises(CorruptedFileError) as exc_info:
        parse_document(invalid_utf8_bytes, filename="corrupt.txt")
    assert "not valid UTF-8" in str(exc_info.value)


def test_scanned_or_empty_text_pdf_rejection():
    """Scanned or image-only PDF with 0 extractable characters raises ScannedDocumentError."""
    # Create a 2-page PDF with empty pages (no insert_text calls)
    empty_pdf_bytes = _create_synthetic_pdf(["", ""])

    with pytest.raises(ScannedDocumentError) as exc_info:
        parse_document(empty_pdf_bytes, filename="scanned_handout.pdf")

    assert "contains no selectable text" in str(exc_info.value)
    # Ensure ScannedDocumentError is also an EmptyDocumentError
    assert issubclass(ScannedDocumentError, EmptyDocumentError)


# ============================================================================
# 2. CHUNKER TESTS
# ============================================================================

def test_chunk_size_and_overlap_behavior():
    """Verify recursive chunker limits chunk size to target and creates non-empty overlap."""
    target_size = 800
    overlap = 150

    # Build a long multi-sentence document (~2000 chars)
    sentences = [
        f"Synthetic sentence number {i} provides detailed academic study concepts for RAG verification."
        for i in range(25)
    ]
    long_text = " ".join(sentences)

    chunks = split_text_recursive(long_text, target_size=target_size, overlap=overlap)

    assert len(chunks) > 1
    # Check that all chunks respect the target chunk size limit
    for chunk in chunks:
        assert len(chunk) <= target_size
        assert len(chunk.strip()) > 0

    # Check that consecutive chunks have non-empty overlap
    for i in range(len(chunks) - 1):
        a = chunks[i]
        b = chunks[i + 1]
        overlap_len = 0
        for k in range(min(len(a), len(b)), 0, -1):
            if a.endswith(b[:k]):
                overlap_len = k
                break
        assert overlap_len > 0, f"Expected non-empty overlap between chunk {i} and {i + 1}"
        assert overlap_len <= overlap, f"Overlap length {overlap_len} exceeded maximum overlap {overlap}"


def test_page_metadata_preservation_pdf():
    """Verify PDF chunks preserve 1-indexed page_number across multiple pages."""
    p1 = " ".join([f"Page 1 sentence {i} explaining core algorithms." for i in range(15)])
    p2 = " ".join([f"Page 2 sentence {i} detailing data structures." for i in range(15)])

    pdf_bytes = _create_synthetic_pdf([p1, p2])
    doc = parse_document(pdf_bytes, filename="algorithms.pdf")

    chunks = chunk_document(material_id=99, document=doc, target_size=800, overlap=150)

    p1_chunks = [c for c in chunks if c.page_number == 1]
    p2_chunks = [c for c in chunks if c.page_number == 2]

    assert len(p1_chunks) >= 1
    assert len(p2_chunks) >= 1
    assert len(chunks) == len(p1_chunks) + len(p2_chunks)

    # Verify no chunk has null or invalid page number
    for c in chunks:
        assert c.page_number in (1, 2)
        assert c.material_id == 99


def test_null_page_metadata_docx_and_txt():
    """Verify DOCX and TXT chunks preserve page_number as None."""
    docx_text = [f"DOCX paragraph {i} with synthetic study notes." for i in range(10)]
    docx_bytes = _create_synthetic_docx(docx_text)
    docx_doc = parse_document(docx_bytes, filename="notes.docx")

    docx_chunks = chunk_document(material_id=10, document=docx_doc)
    assert len(docx_chunks) >= 1
    for c in docx_chunks:
        assert c.page_number is None

    txt_text = " ".join([f"TXT study sentence {i}." for i in range(20)])
    txt_bytes = _create_synthetic_txt(txt_text)
    txt_doc = parse_document(txt_bytes, filename="notes.txt")

    txt_chunks = chunk_document(material_id=20, document=txt_doc)
    assert len(txt_chunks) >= 1
    for c in txt_chunks:
        assert c.page_number is None


def test_deterministic_chunk_ids():
    """Verify chunk IDs are strictly deterministic for a given material_id and chunk_index."""
    assert make_chunk_id(material_id=42, chunk_index=0) == "42_0"
    assert make_chunk_id(material_id=42, chunk_index=7) == "42_7"
    assert make_chunk_id(material_id="mat-uuid", chunk_index=1) == "mat-uuid_1"

    txt_bytes = _create_synthetic_txt(" ".join([f"Study sentence {i} providing comprehensive content for testing." for i in range(50)]))
    doc = parse_document(txt_bytes, filename="study.txt")

    chunks_run1 = chunk_document(material_id=55, document=doc)
    chunks_run2 = chunk_document(material_id=55, document=doc)

    ids1 = [c.chunk_id for c in chunks_run1]
    ids2 = [c.chunk_id for c in chunks_run2]

    assert ids1 == ids2
    assert ids1[0] == "55_0"
    assert ids1[1] == "55_1"

    # Verify chunk_index ordering is strictly 0, 1, 2...
    for idx, c in enumerate(chunks_run1):
        assert c.chunk_index == idx
        assert c.chunk_id == f"55_{idx}"


def test_short_and_long_input_handling():
    """Verify handling of short documents (1 chunk) and long documents without natural separators."""
    # Short document (just above 50 chars threshold)
    short_text = "This is a valid synthetic study text exceeding fifty chars."
    short_chunks = chunk_text(short_text, material_id=1, target_size=800, overlap=150)
    assert len(short_chunks) == 1
    assert short_chunks[0].text == short_text
    assert short_chunks[0].chunk_id == "1_0"

    # Long unbroken string without natural separators (e.g. 2500 'X' characters)
    unbroken_string = "X" * 2500
    unbroken_chunks = chunk_text(unbroken_string, material_id=2, target_size=800, overlap=150)
    assert len(unbroken_chunks) == 4
    for c in unbroken_chunks:
        assert len(c.text) <= 800
        assert len(c.text) > 0


def test_avoid_empty_chunks():
    """Verify that empty chunks are never emitted."""
    text_with_spaces_and_newlines = "Valid sentence one for testing.\n\n\n   \n\nValid sentence two for testing."
    chunks = chunk_text(text_with_spaces_and_newlines, target_size=800, overlap=150)
    assert len(chunks) >= 1
    for c in chunks:
        assert c.text.strip() != ""
        assert c.char_count > 0


def test_overlap_validation():
    """Verify invalid overlap arguments raise ValueError."""
    with pytest.raises(ValueError) as exc:
        split_text_recursive("Some text", target_size=800, overlap=800)
    assert "strictly less than target_size" in str(exc.value)

    with pytest.raises(ValueError) as exc:
        split_text_recursive("Some text", target_size=800, overlap=900)
    assert "strictly less than target_size" in str(exc.value)

    with pytest.raises(ValueError) as exc:
        split_text_recursive("Some text", target_size=0, overlap=50)
    assert "target_size must be positive" in str(exc.value)

    with pytest.raises(ValueError) as exc:
        split_text_recursive("Some text", target_size=800, overlap=-10)
    assert "overlap must be non-negative" in str(exc.value)
