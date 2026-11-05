"""
Pydantic schemas for the StudentOS RAG Study Assistant.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class AssistantQueryRequest(BaseModel):
    """Incoming student question or query for the study assistant."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The student's question or prompt.",
    )
    top_k: int = Field(
        default=4,
        ge=1,
        le=20,
        description="Maximum number of study material chunks to retrieve.",
    )


class Citation(BaseModel):
    """Server-verified provenance metadata for a retrieved document chunk."""

    citation_id: int = Field(
        ...,
        ge=1,
        description="1-based index corresponding to the citation marker in the answer.",
    )
    material_id: int = Field(
        ...,
        ge=1,
        description="Unique relational ID of the study material.",
    )
    filename: str = Field(
        ...,
        description="Original name of the source document.",
    )
    page_number: Optional[int] = Field(
        default=None,
        description="1-indexed page number for PDFs; None for DOCX/TXT.",
    )
    chunk_index: int = Field(
        ...,
        ge=0,
        description="0-indexed position of the chunk in the document.",
    )


class AssistantQueryResponse(BaseModel):
    """Response returned by the RAG study assistant service."""

    answer: str = Field(
        ...,
        description="Grounded response or fallback guidance.",
    )
    intent: str = Field(
        ...,
        description="Classified user intent (e.g., learning_help, general_chat).",
    )
    citations: list[Citation] = Field(
        default_factory=list,
        description="Server-verified citation list supporting the answer.",
    )
    sources_used: int = Field(
        default=0,
        ge=0,
        description="Count of distinct citation sources incorporated.",
    )
