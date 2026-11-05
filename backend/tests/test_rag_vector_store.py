"""
Unit tests for StudentOS RAG Vector Store.

Tests coverage:
- Collection creation and cosine distance configuration ('hnsw:space': 'cosine').
- Adding chunks and count.
- Relevant retrieval with synthetic documents and deterministic mock embeddings.
- Strict student isolation: Student A cannot retrieve Student B's chunks.
- Inactive material ID exclusion (two-tier query filter).
- Empty active-material lists skip ChromaDB queries and return empty list.
- Deletion by student_id and material_id (with cross-tenant deletion protection).
- Stable chunk IDs and complete metadata retention.
- PDF page metadata (1-indexed integers preserved).
- DOCX/TXT null page metadata (-1 sentinel round-trip to None).
- Empty and malformed inputs validation.
- Missing or invalid student identity rejection (None, <=0, non-int).

Uses ChromaDB EphemeralClient() and deterministic mock embeddings.
100% offline, zero network calls, zero model downloads.
"""

from __future__ import annotations

import hashlib
import math
from typing import Any
import pytest
import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from app.rag.chunker import DocumentChunk, make_chunk_id
from app.rag.vector_store import (
    DEFAULT_COLLECTION_NAME,
    PAGE_NUMBER_SENTINEL,
    InvalidStudentError,
    RetrievedChunk,
    VectorStore,
    VectorStoreError,
    page_to_sentinel,
    sentinel_to_page,
)


class DeterministicMockEmbeddingFunction(EmbeddingFunction[Documents]):
    """
    Deterministic unit-length mock embedding function for offline testing.
    Produces identical 384-dimensional unit vectors for identical text.
    """

    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            h = hashlib.sha256(text.encode("utf-8")).digest()
            vec = [(float(h[i % len(h)]) / 255.0 - 0.5) for i in range(self.dimension)]
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            embeddings.append([x / norm for x in vec])
        return embeddings

    @staticmethod
    def name() -> str:
        return "mock_deterministic"

    def get_config(self) -> dict[str, Any]:
        return {"dimension": self.dimension}

    @classmethod
    def build_from_config(cls, config: dict[str, Any]) -> DeterministicMockEmbeddingFunction:
        return cls(dimension=config.get("dimension", 384))


@pytest.fixture
def mock_ef():
    return DeterministicMockEmbeddingFunction(dimension=384)


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient()


@pytest.fixture
def vector_store(ephemeral_client, mock_ef):
    store = VectorStore(
        client=ephemeral_client,
        collection_name=DEFAULT_COLLECTION_NAME,
        embedding_function=mock_ef,
    )
    yield store
    try:
        ephemeral_client.delete_collection(DEFAULT_COLLECTION_NAME)
    except Exception:
        pass


# ============================================================================
# 1. COLLECTION & CONFIGURATION TESTS
# ============================================================================

def test_collection_creation_and_cosine_configuration(vector_store):
    """Verify collection name and explicit cosine distance space ('hnsw:space': 'cosine')."""
    assert vector_store.collection_name == "studentos_study_materials"
    assert vector_store.collection.name == "studentos_study_materials"
    assert vector_store.collection.metadata.get("hnsw:space") == "cosine"
    assert vector_store.count() == 0


def test_sentinel_page_number_conversion():
    """Verify conversion helper functions between None and -1 sentinel."""
    assert page_to_sentinel(None) == PAGE_NUMBER_SENTINEL
    assert page_to_sentinel(1) == 1
    assert page_to_sentinel(42) == 42

    assert sentinel_to_page(PAGE_NUMBER_SENTINEL) is None
    assert sentinel_to_page(-1) is None
    assert sentinel_to_page(1) == 1
    assert sentinel_to_page(42) == 42


# ============================================================================
# 2. ADD CHUNKS & RETRIEVAL TESTS
# ============================================================================

def test_add_chunks_and_count(vector_store):
    """Verify adding DocumentChunks stores them and updates collection count."""
    chunks = [
        DocumentChunk(
            chunk_id=make_chunk_id(10, 0),
            material_id=10,
            chunk_index=0,
            text="First synthetic chunk on algorithms and computational complexity.",
            page_number=1,
            char_count=65,
        ),
        DocumentChunk(
            chunk_id=make_chunk_id(10, 1),
            material_id=10,
            chunk_index=1,
            text="Second synthetic chunk describing graph traversal mechanisms.",
            page_number=2,
            char_count=61,
        ),
    ]

    added = vector_store.add_chunks(chunks, student_id=1, filename="algorithms.pdf")
    assert added == 2
    assert vector_store.count() == 2


def test_relevant_retrieval(vector_store):
    """Verify retrieval returns matching chunks with source metadata and cosine distance."""
    chunk1 = DocumentChunk(
        chunk_id="10_0",
        material_id=10,
        chunk_index=0,
        text="Quantum mechanics explains the behavior of energy and matter on atomic scales.",
        page_number=1,
        char_count=77,
    )
    chunk2 = DocumentChunk(
        chunk_id="10_1",
        material_id=10,
        chunk_index=1,
        text="Organic chemistry focuses on the structure, properties, and reactions of carbon compounds.",
        page_number=2,
        char_count=90,
    )
    vector_store.add_chunks([chunk1, chunk2], student_id=1, filename="science.pdf")

    results = vector_store.query(
        query_text="Quantum mechanics energy matter",
        student_id=1,
        active_material_ids=[10],
        top_k=2,
    )

    assert len(results) >= 1
    top_result = results[0]
    assert isinstance(top_result, RetrievedChunk)
    assert top_result.material_id == 10
    assert top_result.student_id == 1
    assert top_result.filename == "science.pdf"
    assert top_result.page_number in (1, 2)
    assert isinstance(top_result.distance, float)
    assert top_result.distance >= 0.0


# ============================================================================
# 3. STUDENT ISOLATION & ACCESS CONTROL
# ============================================================================

def test_student_isolation_cannot_retrieve_other_student_chunks(vector_store):
    """Verify Student A cannot retrieve Student B's chunks under any query."""
    # Student 1 uploads notes
    c1 = DocumentChunk(
        chunk_id="100_0",
        material_id=100,
        chunk_index=0,
        text="Confidential student one research findings on distributed operating systems.",
        page_number=1,
        char_count=75,
    )
    vector_store.add_chunks([c1], student_id=1, filename="student1_notes.pdf")

    # Student 2 uploads notes
    c2 = DocumentChunk(
        chunk_id="200_0",
        material_id=200,
        chunk_index=0,
        text="Confidential student two research findings on compiler optimization techniques.",
        page_number=1,
        char_count=77,
    )
    vector_store.add_chunks([c2], student_id=2, filename="student2_notes.pdf")

    assert vector_store.count() == 2

    # Student 1 queries — even if material 200 is passed in active list
    s1_results = vector_store.query(
        query_text="research findings",
        student_id=1,
        active_material_ids=[100, 200],
    )
    assert len(s1_results) == 1
    assert s1_results[0].student_id == 1
    assert s1_results[0].material_id == 100
    assert "student one" in s1_results[0].text
    assert "student two" not in s1_results[0].text

    # Student 2 queries — even if material 100 is passed in active list
    s2_results = vector_store.query(
        query_text="research findings",
        student_id=2,
        active_material_ids=[100, 200],
    )
    assert len(s2_results) == 1
    assert s2_results[0].student_id == 2
    assert s2_results[0].material_id == 200
    assert "student two" in s2_results[0].text
    assert "student one" not in s2_results[0].text


def test_inactive_material_ids_are_excluded(vector_store):
    """Verify that chunks belonging to inactive (DELETING / FAILED) materials are excluded."""
    c_active = DocumentChunk(
        chunk_id="10_0",
        material_id=10,
        chunk_index=0,
        text="Active syllabus guide on software testing and verification methods.",
        page_number=1,
        char_count=67,
    )
    c_failed = DocumentChunk(
        chunk_id="11_0",
        material_id=11,
        chunk_index=0,
        text="Failed legacy document text containing obsolete draft software guidelines.",
        page_number=1,
        char_count=74,
    )
    vector_store.add_chunks([c_active, c_failed], student_id=1, filename="guide.pdf")

    # Query with ONLY material 10 active
    results = vector_store.query(
        query_text="software guidelines",
        student_id=1,
        active_material_ids=[10],
    )

    assert len(results) == 1
    assert results[0].material_id == 10
    assert "Active syllabus" in results[0].text


def test_empty_active_materials_skips_chroma_query(vector_store):
    """Verify that an empty active_material_ids list returns [] without querying ChromaDB."""
    c = DocumentChunk(
        chunk_id="5_0",
        material_id=5,
        chunk_index=0,
        text="Some study text that should not be queried.",
        page_number=1,
        char_count=43,
    )
    vector_store.add_chunks([c], student_id=1, filename="doc.pdf")

    # Pass empty active_material_ids
    results = vector_store.query(
        query_text="study text",
        student_id=1,
        active_material_ids=[],
    )

    assert results == []


# ============================================================================
# 4. DELETION & CROSS-TENANT ISOLATION
# ============================================================================

def test_deletion_by_student_and_material(vector_store):
    """Verify deletion removes only the target material for the target student."""
    # Student 1 has materials 10 and 20
    s1_m10 = DocumentChunk("10_0", 10, 0, "Student 1 Material 10 text", 1, 27)
    s1_m20 = DocumentChunk("20_0", 20, 0, "Student 1 Material 20 text", 1, 27)
    vector_store.add_chunks([s1_m10, s1_m20], student_id=1, filename="s1_docs.pdf")

    # Student 2 has material 30 (separate auto-increment ID)
    s2_m30 = DocumentChunk("30_0", 30, 0, "Student 2 Material 30 text", 1, 27)
    vector_store.add_chunks([s2_m30], student_id=2, filename="s2_docs.pdf")

    assert vector_store.count() == 3

    # Delete Student 1's material 10
    vector_store.delete_material(student_id=1, material_id=10)

    assert vector_store.count() == 2

    # Verify Student 1 material 10 is gone
    s1_res = vector_store.query("text", student_id=1, active_material_ids=[10, 20])
    assert len(s1_res) == 1
    assert s1_res[0].material_id == 20

    # Verify Student 2 material 30 is completely intact
    s2_res = vector_store.query("text", student_id=2, active_material_ids=[30])
    assert len(s2_res) == 1
    assert s2_res[0].material_id == 30
    assert s2_res[0].student_id == 2


# ============================================================================
# 5. METADATA HANDLING: PDF VS DOCX/TXT
# ============================================================================

def test_pdf_page_metadata_preserved(vector_store):
    """Verify PDF chunks preserve human-readable 1-indexed page integers."""
    c = DocumentChunk(
        chunk_id="30_0",
        material_id=30,
        chunk_index=0,
        text="PDF page metadata verification text for StudentOS testing.",
        page_number=5,
        char_count=58,
    )
    vector_store.add_chunks([c], student_id=1, filename="handout.pdf")

    results = vector_store.query("verification", student_id=1, active_material_ids=[30])
    assert len(results) == 1
    assert results[0].page_number == 5
    assert isinstance(results[0].page_number, int)


def test_docx_txt_null_page_metadata(vector_store):
    """Verify DOCX and TXT chunks with page_number=None round-trip to None via sentinel."""
    c = DocumentChunk(
        chunk_id="40_0",
        material_id=40,
        chunk_index=0,
        text="DOCX flow document text without physical page numbers.",
        page_number=None,
        char_count=54,
    )
    vector_store.add_chunks([c], student_id=1, filename="lecture.docx")

    # Verify internal sentinel is stored in ChromaDB
    raw_get = vector_store.collection.get(ids=["40_0"], include=["metadatas"])
    assert raw_get["metadatas"][0]["page_number"] == PAGE_NUMBER_SENTINEL

    # Verify query returns page_number as None
    results = vector_store.query("document text", student_id=1, active_material_ids=[40])
    assert len(results) == 1
    assert results[0].page_number is None


# ============================================================================
# 6. INPUT VALIDATION & ERROR HANDLING
# ============================================================================

def test_missing_or_invalid_student_identity_rejection(vector_store):
    """Verify missing, negative, or non-integer student IDs are rejected."""
    c = DocumentChunk("1_0", 1, 0, "Valid text", 1, 10)

    # Missing student_id
    with pytest.raises(InvalidStudentError):
        vector_store.add_chunks([c], student_id=None, filename="doc.pdf")

    with pytest.raises(InvalidStudentError):
        vector_store.query("query", student_id=None, active_material_ids=[1])

    with pytest.raises(InvalidStudentError):
        vector_store.delete_material(student_id=None, material_id=1)

    # Non-positive student_id
    with pytest.raises(InvalidStudentError):
        vector_store.add_chunks([c], student_id=0, filename="doc.pdf")

    with pytest.raises(InvalidStudentError):
        vector_store.add_chunks([c], student_id=-1, filename="doc.pdf")

    # Non-integer student_id
    with pytest.raises(InvalidStudentError):
        vector_store.query("query", student_id="student_1", active_material_ids=[1])

    with pytest.raises(InvalidStudentError):
        vector_store.query("query", student_id=True, active_material_ids=[1])  # bool is subclass of int


def test_empty_and_malformed_inputs(vector_store):
    """Verify safe handling of empty chunk lists, blank filenames, and invalid bounds."""
    # Empty chunk sequence
    assert vector_store.add_chunks([], student_id=1, filename="doc.pdf") == 0

    # Blank filename
    c = DocumentChunk("1_0", 1, 0, "Valid text", 1, 10)
    with pytest.raises(ValueError) as exc:
        vector_store.add_chunks([c], student_id=1, filename="")
    assert "filename must be a non-empty string" in str(exc.value)

    # Blank query text
    with pytest.raises(ValueError) as exc:
        vector_store.query("", student_id=1, active_material_ids=[1])
    assert "query_text must be a non-empty string" in str(exc.value)

    # Non-positive top_k
    with pytest.raises(ValueError) as exc:
        vector_store.query("query", student_id=1, active_material_ids=[1], top_k=0)
    assert "top_k must be a positive integer" in str(exc.value)

    # Non-positive material_id in delete
    with pytest.raises(ValueError) as exc:
        vector_store.delete_material(student_id=1, material_id=0)
    assert "Must be positive" in str(exc.value)
