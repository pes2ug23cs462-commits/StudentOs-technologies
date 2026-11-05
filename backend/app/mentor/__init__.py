"""
StudentOS Mentor Package.

Provides intent classification, LLM interaction, and context adaptation
for the AI mentor assistant.
"""

from app.mentor.adapter import adapt_student_context
from app.mentor.intent_classifier import (
    INTENT_TO_ROUTE,
    classify_intent,
    extract_entities,
    normalize_message,
)
from app.mentor.llm_provider import (
    GroqLLMProvider,
    LLMProviderError,
    generate_json_response,
    generate_response,
)

__all__ = [
    "adapt_student_context",
    "classify_intent",
    "extract_entities",
    "normalize_message",
    "INTENT_TO_ROUTE",
    "GroqLLMProvider",
    "LLMProviderError",
    "generate_response",
    "generate_json_response",
]
