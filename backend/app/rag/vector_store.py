"""
ChromaDB Vector Store wrapper for StudentOS RAG Study Assistant.

Manages persistent and in-memory vector storage for student study materials:
- Collection name: 'studentos_study_materials'
- Metric: Cosine distance ('hnsw:space': 'cosine')
- Strict tenant isolation: Queries and deletions require authenticated student_id.
- Two-tier active document filtering: Queries require non-empty active material_ids.
- Sentinel handling: Maps page_number=None <-> -1 for ChromaDB compatibility.
- Zero-leak logging: Never logs chunk content, queries, or user documents.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Sequence, Union

import chromadb

from app.rag.chunker import DocumentChunk

logger = logging.getLogger("studentos.rag.vector_store")

DEFAULT_COLLECTION_NAME = "studentos_study_materials"
PAGE_NUMBER_SENTINEL = -1


class VectorStoreError(Exception):
    """Base exception for vector store operations."""
    pass


class InvalidStudentError(VectorStoreError, ValueError):
    """Raised when student_id is missing, non-positive, or invalid."""
    pass


@dataclass(frozen=True)
class RetrievedChunk:
    """Represents a retrieved chunk with source metadata and cosine distance."""
    chunk_id: str
    material_id: int
    student_id: int
    chunk_index: int
    filename: str
    page_number: Optional[int]  # None if internal sentinel was -1
    text: str
    distance: float


def page_to_sentinel(page_number: Optional[int]) -> int:
    """Convert page_number (int or None) into a ChromaDB-compatible integer sentinel."""
    return PAGE_NUMBER_SENTINEL if page_number is None else int(page_number)


def sentinel_to_page(metadata_page: int) -> Optional[int]:
    """Convert internal integer sentinel back into human-readable page_number or None."""
    return None if metadata_page == PAGE_NUMBER_SENTINEL else int(metadata_page)


class VectorStore:
    """
    Wrapper around ChromaDB for student study material chunks.
    """

    def __init__(
        self,
        client: Optional[chromadb.ClientAPI] = None,
        collection_name: str = DEFAULT_COLLECTION_NAME,
        embedding_function: Optional[Any] = None,
        persist_directory: Optional[Union[str, Path]] = None,
    ):
        """
        Initialize VectorStore with an existing client or configuration.

        Parameters:
            client: Existing ChromaDB client (e.g. EphemeralClient for testing).
            collection_name: Name of the collection ('studentos_study_materials').
            embedding_function: Optional embedding function. If None, none is passed
                                to get_or_create_collection to prevent unsolicited downloads.
            persist_directory: Optional directory path for local persistent storage.
        """
        self.collection_name = collection_name
        self.embedding_function = embedding_function

        if client is not None:
            self.client = client
        elif persist_directory is not None:
            self.client = chromadb.PersistentClient(path=str(persist_directory))
        else:
            self.client = chromadb.EphemeralClient()

        try:
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
                embedding_function=self.embedding_function,
            )
        except Exception as e:
            logger.error("Failed to initialize ChromaDB collection '%s': %s", self.collection_name, type(e).__name__)
            raise VectorStoreError(f"Failed to initialize ChromaDB collection: {type(e).__name__}") from e

    def add_chunks(
        self,
        chunks: Sequence[DocumentChunk],
        student_id: int,
        filename: str,
    ) -> int:
        """
        Add document chunks for an authenticated student into the vector store.

        Parameters:
            chunks: Sequence of DocumentChunk instances.
            student_id: Authenticated student ID (must be positive integer).
            filename: Original source file name.

        Returns:
            Count of inserted chunks.
        """
        self._validate_student_id(student_id)

        if not filename or not isinstance(filename, str) or not filename.strip():
            raise ValueError("filename must be a non-empty string")

        if not chunks:
            return 0

        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []

        for chunk in chunks:
            if not isinstance(chunk, DocumentChunk):
                raise ValueError(f"Expected DocumentChunk instance, got {type(chunk)}")

            material_id = int(chunk.material_id)
            if material_id <= 0:
                raise ValueError(f"Invalid material_id: {material_id}. Must be positive.")

            ids.append(str(chunk.chunk_id))
            documents.append(chunk.text)
            metadatas.append(
                {
                    "student_id": int(student_id),
                    "material_id": material_id,
                    "chunk_index": int(chunk.chunk_index),
                    "filename": str(filename),
                    "page_number": page_to_sentinel(chunk.page_number),
                }
            )

        try:
            self.collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
            )
            logger.info(
                "Added %d chunks for student_id=%d, material_id=%d, filename='%s'",
                len(ids),
                student_id,
                int(chunks[0].material_id),
                filename,
            )
            return len(ids)
        except Exception as e:
            logger.error(
                "Failed adding chunks for student_id=%d: %s",
                student_id,
                type(e).__name__,
            )
            raise VectorStoreError(f"ChromaDB insert failed: {type(e).__name__}") from e

    def query(
        self,
        query_text: str,
        student_id: int,
        active_material_ids: Sequence[int],
        top_k: int = 4,
        distance_threshold: Optional[float] = None,
    ) -> list[RetrievedChunk]:
        """
        Retrieve relevant chunks enforcing mandatory student isolation and active material filtering.

        Parameters:
            query_text: Search query string.
            student_id: Authenticated student ID (mandatory; must be positive int).
            active_material_ids: Active material IDs from relational DB in PARSED state.
            top_k: Maximum number of chunks to return (default 4).
            distance_threshold: Maximum cosine distance cutoff (optional).

        Returns:
            List of RetrievedChunk instances.
        """
        self._validate_student_id(student_id)

        if not query_text or not isinstance(query_text, str) or not query_text.strip():
            raise ValueError("query_text must be a non-empty string")

        if top_k <= 0:
            raise ValueError("top_k must be a positive integer")

        # Step 3 Requirement 10: If active material IDs are empty, return empty list without querying ChromaDB
        if not active_material_ids:
            logger.debug("No active material IDs provided for student_id=%d; returning empty results", student_id)
            return []

        cleaned_material_ids = [int(m_id) for m_id in active_material_ids if int(m_id) > 0]
        if not cleaned_material_ids:
            return []

        # Compound filter enforcing both student isolation and active material IDs
        material_filter = (
            {"material_id": {"$eq": cleaned_material_ids[0]}}
            if len(cleaned_material_ids) == 1
            else {"material_id": {"$in": cleaned_material_ids}}
        )

        where_clause: dict[str, Any] = {
            "$and": [
                {"student_id": {"$eq": int(student_id)}},
                material_filter,
            ]
        }

        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=top_k,
                where=where_clause,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error(
                "Query failed for student_id=%d: %s",
                student_id,
                type(e).__name__,
            )
            raise VectorStoreError(f"ChromaDB query failed: {type(e).__name__}") from e

        retrieved: list[RetrievedChunk] = []
        if not results or not results.get("ids") or not results["ids"][0]:
            return []

        ids_list = results["ids"][0]
        docs_list = results["documents"][0] if results.get("documents") else []
        metas_list = results["metadatas"][0] if results.get("metadatas") else []
        dists_list = results["distances"][0] if results.get("distances") else []

        for idx, chunk_id in enumerate(ids_list):
            dist = float(dists_list[idx]) if idx < len(dists_list) else 0.0
            if distance_threshold is not None and dist > distance_threshold:
                continue

            meta = metas_list[idx] if idx < len(metas_list) else {}
            doc_text = docs_list[idx] if idx < len(docs_list) else ""

            retrieved.append(
                RetrievedChunk(
                    chunk_id=str(chunk_id),
                    material_id=int(meta.get("material_id", 0)),
                    student_id=int(meta.get("student_id", student_id)),
                    chunk_index=int(meta.get("chunk_index", 0)),
                    filename=str(meta.get("filename", "")),
                    page_number=sentinel_to_page(int(meta.get("page_number", PAGE_NUMBER_SENTINEL))),
                    text=doc_text,
                    distance=dist,
                )
            )

        return retrieved

    def delete_material(
        self,
        student_id: int,
        material_id: int,
    ) -> None:
        """
        Delete all vector chunks belonging to a specific material ID and student ID.

        Parameters:
            student_id: Authenticated student ID (mandatory; must be positive int).
            material_id: Material ID to delete.
        """
        self._validate_student_id(student_id)

        int_material_id = int(material_id)
        if int_material_id <= 0:
            raise ValueError(f"Invalid material_id: {material_id}. Must be positive.")

        where_clause: dict[str, Any] = {
            "$and": [
                {"student_id": {"$eq": int(student_id)}},
                {"material_id": {"$eq": int_material_id}},
            ]
        }

        try:
            self.collection.delete(where=where_clause)
            logger.info("Deleted chunks for student_id=%d, material_id=%d", student_id, int_material_id)
        except Exception as e:
            logger.error(
                "Delete failed for student_id=%d, material_id=%d: %s",
                student_id,
                int_material_id,
                type(e).__name__,
            )
            raise VectorStoreError(f"ChromaDB delete failed: {type(e).__name__}") from e

    def count(self) -> int:
        """Return total chunk count across collection."""
        try:
            return self.collection.count()
        except Exception as e:
            raise VectorStoreError(f"Failed to count chunks: {type(e).__name__}") from e

    @staticmethod
    def _validate_student_id(student_id: Any) -> None:
        if student_id is None:
            raise InvalidStudentError("student_id is required; cannot be None")
        if not isinstance(student_id, int) or isinstance(student_id, bool) or student_id <= 0:
            raise InvalidStudentError(f"student_id must be a positive integer, got: {student_id!r}")
