"""
Deterministic Recursive Character Chunker for StudentOS RAG Study Assistant.

Splits document text into manageable chunks respecting semantic boundaries:
- Target chunk size: 800 characters.
- Overlap: 150 characters.
- Hierarchy: Paragraphs (\\n\\n) -> Lines (\\n) -> Sentences (. ? ! ;) -> Words ( ) -> Characters ("").
- Preserves 1-indexed page numbers for PDF chunks and None for DOCX/TXT chunks.
- Generates deterministic chunk IDs: f"{material_id}_{chunk_index}".
- Prevents empty chunks, infinite loops, and duplicate-only chunks.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Union

from app.rag.parser import ParsedDocument

logger = logging.getLogger("studentos.rag.chunker")

DEFAULT_TARGET_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 150
SEPARATORS = ["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""]


@dataclass(frozen=True)
class DocumentChunk:
    """Represents an atomic text chunk for vector embedding and retrieval."""
    chunk_id: str
    material_id: Union[int, str]
    chunk_index: int
    text: str
    page_number: Optional[int]
    char_count: int


def make_chunk_id(material_id: Union[int, str], chunk_index: int) -> str:
    """Generate a deterministic chunk ID for a given material and sequence index."""
    return f"{material_id}_{chunk_index}"


def split_text_recursive(
    text: str,
    target_size: int = DEFAULT_TARGET_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    """
    Split a single string recursively using hierarchical separators with overlap.
    """
    if target_size <= 0:
        raise ValueError("target_size must be positive")
    if overlap < 0:
        raise ValueError("overlap must be non-negative")
    if overlap >= target_size:
        raise ValueError(f"overlap ({overlap}) must be strictly less than target_size ({target_size})")

    def _split(t: str, seps: list[str]) -> list[str]:
        if not t:
            return []
        if len(t) <= target_size:
            clean = t.strip()
            return [clean] if clean else []

        chosen_sep = ""
        chosen_idx = len(seps) - 1
        for idx, s in enumerate(seps):
            if s == "":
                chosen_sep = ""
                chosen_idx = idx
                break
            if s in t:
                chosen_sep = s
                chosen_idx = idx
                break

        if chosen_sep == "":
            # Direct character slicing fallback for unbroken strings without separators
            step = max(1, target_size - overlap)
            chunks: list[str] = []
            for i in range(0, len(t), step):
                if i > 0 and i + overlap >= len(t):
                    break
                chunk = t[i : i + target_size].strip()
                if chunk:
                    chunks.append(chunk)
            return chunks

        parts = t.split(chosen_sep)
        sub_seps = seps[chosen_idx + 1:]

        processed_parts: list[str] = []
        for p in parts:
            if len(p) > target_size and sub_seps:
                processed_parts.extend(_split(p, sub_seps))
            elif p:
                processed_parts.append(p)

        docs: list[str] = []
        current_doc: list[str] = []
        total = 0

        for piece in processed_parts:
            piece_len = len(piece)
            sep_len = len(chosen_sep) if current_doc else 0

            if total + sep_len + piece_len > target_size:
                if current_doc:
                    doc = chosen_sep.join(current_doc).strip()
                    if doc:
                        docs.append(doc)
                    # Roll back front items until remaining length <= overlap
                    while current_doc and (total > overlap or (total + sep_len + piece_len > target_size and total > 0)):
                        removed = current_doc.pop(0)
                        total -= len(removed) + (len(chosen_sep) if current_doc else 0)

            current_doc.append(piece)
            total += piece_len + (len(chosen_sep) if len(current_doc) > 1 else 0)

        if current_doc:
            doc = chosen_sep.join(current_doc).strip()
            if doc:
                docs.append(doc)

        return docs

    return _split(text, SEPARATORS)


def chunk_document(
    material_id: Union[int, str],
    document: ParsedDocument,
    target_size: int = DEFAULT_TARGET_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[DocumentChunk]:
    """
    Chunk an entire ParsedDocument into deterministic DocumentChunks.

    PDF documents are chunked page-by-page preserving the 1-indexed page_number.
    DOCX and TXT documents are chunked preserving page_number=None.
    """
    chunks: list[DocumentChunk] = []
    chunk_index = 0

    for page in document.pages:
        if not page.text or not page.text.strip():
            continue

        page_text_chunks = split_text_recursive(
            page.text,
            target_size=target_size,
            overlap=overlap,
        )

        for text_chunk in page_text_chunks:
            cleaned = text_chunk.strip()
            if not cleaned:
                continue

            chunk_id = make_chunk_id(material_id, chunk_index)
            chunks.append(
                DocumentChunk(
                    chunk_id=chunk_id,
                    material_id=material_id,
                    chunk_index=chunk_index,
                    text=cleaned,
                    page_number=page.page_number,
                    char_count=len(cleaned),
                )
            )
            chunk_index += 1

    logger.info(
        "Chunked document '%s' (material_id=%s) into %d chunks",
        document.filename,
        material_id,
        len(chunks),
    )
    return chunks


def chunk_text(
    text: str,
    material_id: Union[int, str] = 1,
    page_number: Optional[int] = None,
    target_size: int = DEFAULT_TARGET_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[DocumentChunk]:
    """
    Convenience function to chunk raw text directly.
    """
    if not text or not text.strip():
        return []

    text_chunks = split_text_recursive(text, target_size=target_size, overlap=overlap)
    return [
        DocumentChunk(
            chunk_id=make_chunk_id(material_id, i),
            material_id=material_id,
            chunk_index=i,
            text=c,
            page_number=page_number,
            char_count=len(c),
        )
        for i, c in enumerate(text_chunks)
        if c.strip()
    ]
