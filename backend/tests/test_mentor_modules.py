"""
Tests for StudentOS Mentor Modules.

Covers:
1. Intent classification (rules, entities, Hinglish, safe fallback).
2. LLM provider (true lazy initialization, missing API key handling at generation time, client reuse, error normalization).
3. Student context adapter (production model to mentor prototype dictionary mapping).

All tests are 100% offline with zero external network or database calls.
"""

from unittest.mock import MagicMock, patch

import pytest

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
from app.models.student_context import AssessmentContext, StudentContext


# ===========================================================================
# 1. Intent Classifier Tests
# ===========================================================================

def test_intent_registry_has_all_expected_intents():
    """Verify that all 17 approved intents and routes are registered."""
    expected_intents = {
        "general_chat",
        "goal_setting",
        "career_guidance",
        "learning_help",
        "motivation_support",
        "roadmap_creation",
        "roadmap_update",
        "roadmap_view",
        "resource_recommendation",
        "task_management",
        "plan_create",
        "plan_update",
        "plan_view",
        "progress_query",
        "recovery_plan",
        "profile_update",
        "unclear",
    }
    assert expected_intents.issubset(set(INTENT_TO_ROUTE.keys()))
    assert len(INTENT_TO_ROUTE) == 17


def test_regex_classification_without_api_key(monkeypatch):
    """Verify regex classification functions completely offline without GROQ_API_KEY."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    test_cases = [
        ("hello", "general_chat", "mentor_conversation"),
        ("how are you", "general_chat", "mentor_conversation"),
        ("I want to become a data scientist", "career_guidance", "mentor_conversation"),
        ("Create a roadmap for learning machine learning", "roadmap_creation", "roadmap_workflow"),
        ("Update my existing roadmap", "roadmap_update", "roadmap_workflow"),
        ("Explain overfitting", "learning_help", "mentor_conversation"),
        ("Recommend free Python courses", "resource_recommendation", "resource_workflow"),
        ("Add a task to practise SQL tomorrow", "task_management", "task_workflow"),
        ("I feel stuck and need motivation", "motivation_support", "mentor_conversation"),
        ("kal se study plan start karna hai", "plan_create", "plan_workflow"),
        ("show my progress", "progress_query", "progress_workflow"),
        ("missed my study sessions and need to catch up", "recovery_plan", "recovery_workflow"),
        ("I have 1 hour per day to learn Python", "profile_update", "learner_context_update"),
    ]

    for message, expected_intent, expected_route in test_cases:
        res = classify_intent(message, use_groq=False)
        assert res["intent"] == expected_intent, f"Failed on: {message}"
        assert res["primary_intent"] == expected_intent
        assert res["route"] == expected_route
        assert res["method"] == "rules"
        assert res["confidence"] > 0.0


def test_entity_extraction_extracts_topics_goals_time():
    """Verify entity extraction correctly surfaces topics, career goals, and time."""
    message = (
        "I want to learn Python and become a data scientist "
        "with 60 minutes per day by tomorrow"
    )
    entities = extract_entities(message)

    assert "python" in [t.lower() for t in entities.get("topics", [])]
    assert "data_scientist" in entities.get("career_goal", "").lower() or "data scientist" in entities.get("career_goal", "").lower()
    assert entities.get("available_minutes_per_day") == 60
    assert entities.get("deadline_hint") == "tomorrow"
    assert "tomorrow" in entities.get("date_or_day_mentions", [])


def test_unclear_intent_safe_handling():
    """Verify empty or vague inputs safely map to 'unclear' with needs_clarification."""
    # Empty message
    empty_res = classify_intent("", use_groq=False)
    assert empty_res["intent"] == "unclear"
    assert empty_res["needs_clarification"] is True
    assert empty_res["route"] == "clarification"
    assert empty_res["confidence"] == 0.0

    # Vague message without groq
    vague_res = classify_intent("Help me", use_groq=False)
    assert vague_res["intent"] == "unclear"
    assert vague_res["needs_clarification"] is True


def test_groq_fallback_not_called_when_rule_matches():
    """Verify _classify_with_groq is never invoked when rule matching succeeds, even with use_groq=True."""
    with patch("app.mentor.intent_classifier._classify_with_groq") as mock_groq:
        res = classify_intent("Create a roadmap for learning machine learning", use_groq=True)
        assert res["intent"] == "roadmap_creation"
        assert mock_groq.call_count == 0


def test_groq_fallback_called_when_unclear_and_use_groq_true():
    """Verify _classify_with_groq is only invoked when rule matching fails and use_groq=True."""
    mock_fallback_data = {
        "primary_intent": "career_guidance",
        "intents": ["career_guidance"],
        "entities": {"career_goal": "DevOps Engineer"},
        "reason": "Classified using Groq fallback mock.",
    }

    with patch("app.mentor.intent_classifier._classify_with_groq", return_value=mock_fallback_data) as mock_groq:
        res = classify_intent("some ambiguous query 12345", use_groq=True)
        assert mock_groq.call_count == 1
        assert res["intent"] == "career_guidance"
        assert res["method"] == "groq"
        assert res["entities"]["career_goal"] == "DevOps Engineer"


# ===========================================================================
# 2. LLM Provider Tests (True Lazy Initialization & Error Normalization)
# ===========================================================================

def test_llm_provider_import_without_api_key(monkeypatch):
    """Verify importing llm_provider succeeds without GROQ_API_KEY and creates zero clients."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with patch("app.mentor.llm_provider.Groq") as mock_groq:
        import app.mentor.llm_provider as provider_mod
        assert hasattr(provider_mod, "GroqLLMProvider")
        assert hasattr(provider_mod, "LLMProviderError")
        assert mock_groq.call_count == 0


def test_llm_provider_lazy_initialization():
    """
    Verify Groq client is truly lazy:
    1. Constructing GroqLLMProvider creates ZERO clients.
    2. First generate() call creates exactly ONE client.
    3. Subsequent generate_json() call reuses that client without creating a new one.
    4. Repeated generation calls do not create additional clients.
    """
    with patch("app.mentor.llm_provider.Groq") as mock_groq_cls:
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice_text = MagicMock()
        mock_choice_text.message.content = "Text response"

        mock_choice_json = MagicMock()
        mock_choice_json.message.content = '{"key": "value"}'

        mock_client.chat.completions.create.side_effect = [
            MagicMock(choices=[mock_choice_text]),
            MagicMock(choices=[mock_choice_json]),
            MagicMock(choices=[mock_choice_text]),
        ]

        # 1. Constructing provider creates ZERO clients
        provider = GroqLLMProvider(api_key="mock_key")
        assert mock_groq_cls.call_count == 0
        assert provider._client is None
        assert provider.model == "llama-3.3-70b-versatile"

        # 2. First generate() call creates exactly ONE client
        res1 = provider.generate("System", "User message 1")
        assert res1 == "Text response"
        assert mock_groq_cls.call_count == 1
        assert provider._client is not None

        # 3. Subsequent generate_json() reuses that client (call_count remains 1)
        res2 = provider.generate_json("System", "User message 2")
        assert res2 == {"key": "value"}
        assert mock_groq_cls.call_count == 1

        # 4. Repeated generation calls do not create additional clients
        res3 = provider.generate("System", "User message 3")
        assert res3 == "Text response"
        assert mock_groq_cls.call_count == 1


def test_llm_provider_missing_api_key_raises_only_at_generation_time(monkeypatch):
    """Verify missing GROQ_API_KEY raises LLMProviderError only when generation is attempted."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    # 1. Construction succeeds without an API key because initialization is lazy
    provider = GroqLLMProvider(api_key=None)
    assert provider._client is None

    # 2. Error is raised only when generate() is called
    with pytest.raises(LLMProviderError, match="GROQ_API_KEY is missing"):
        provider.generate("System prompt", "User query")

    # 3. Error is also raised when generate_json() is called
    with pytest.raises(LLMProviderError, match="GROQ_API_KEY is missing"):
        provider.generate_json("System prompt", "User query")


def test_llm_provider_generate_text_with_mock():
    """Verify generate returns stripped plain text from mock Groq client."""
    with patch("app.mentor.llm_provider.Groq") as mock_groq_cls:
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = "   Hello from mock mentor!   "
        mock_client.chat.completions.create.return_value.choices = [mock_choice]

        provider = GroqLLMProvider(api_key="mock_key")
        res = provider.generate("System prompt", "User query")

        assert res == "Hello from mock mentor!"
        assert mock_client.chat.completions.create.call_count == 1


def test_llm_provider_generate_json_with_mock():
    """Verify generate_json returns parsed dictionary from mock Groq client."""
    with patch("app.mentor.llm_provider.Groq") as mock_groq_cls:
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        mock_choice = MagicMock()
        mock_choice.message.content = '{"recommendation": "Study trees", "estimated_hours": 3}'
        mock_client.chat.completions.create.return_value.choices = [mock_choice]

        provider = GroqLLMProvider(api_key="mock_key")
        data = provider.generate_json("System prompt", "User query")

        assert isinstance(data, dict)
        assert data["recommendation"] == "Study trees"
        assert data["estimated_hours"] == 3


def test_llm_provider_empty_inputs_rejected():
    """Verify empty system prompts or user messages raise ValueError."""
    with patch("app.mentor.llm_provider.Groq"):
        provider = GroqLLMProvider(api_key="mock_key")
        with pytest.raises(ValueError, match="system_prompt cannot be empty"):
            provider.generate("", "Hello")
        with pytest.raises(ValueError, match="user_message cannot be empty"):
            provider.generate("System", "   ")


def test_llm_provider_error_normalization():
    """Verify provider normalizes Groq API errors and empty responses into LLMProviderError."""
    with patch("app.mentor.llm_provider.Groq") as mock_groq_cls:
        mock_client = MagicMock()
        mock_groq_cls.return_value = mock_client

        provider = GroqLLMProvider(api_key="mock_key")

        # Empty response
        mock_choice = MagicMock()
        mock_choice.message.content = ""
        mock_client.chat.completions.create.return_value.choices = [mock_choice]
        with pytest.raises(LLMProviderError, match="empty response"):
            provider.generate("System", "User")

        # Invalid JSON
        mock_choice.message.content = "not valid json {{"
        with pytest.raises(LLMProviderError, match="invalid JSON"):
            provider.generate_json("System", "User")


# ===========================================================================
# 3. Context Adapter Tests
# ===========================================================================

def test_adapt_student_context_full():
    """Verify complete StudentContext model maps accurately into prototype context dictionary."""
    context = StudentContext(
        student_id=7,
        full_name="Jane Doe",
        field_of_study="Computer Science",
        academic_year="3rd Year",
        goals=["Master algorithms", "Learn FastAPI"],
        preferences={"study_mode": "hands-on", "available_minutes_per_day": 45},
        profile_completed=True,
        assessments=[
            AssessmentContext(
                assignment_id=101,
                score=18.0,
                max_score=20.0,
                percentage=90.0,
                completed_at="2026-10-20T10:00:00",
            )
        ],
        average_percentage=90.0,
        llm_context="Jane is a 3rd Year CS student with 90% average.",
    )

    adapted = adapt_student_context(context)

    # 1. Student ID must be string matching prototype contract
    assert adapted["student_id"] == "7"
    assert isinstance(adapted["student_id"], str)
    assert adapted["is_synthetic"] is False

    # 2. Profile mapping
    profile = adapted["profile"]
    assert profile["full_name"] == "Jane Doe"
    assert profile["first_name"] == "Jane"
    assert profile["field_of_study"] == "Computer Science"
    assert profile["academic_year"] == "3rd Year"
    assert profile["profile_completed"] is True
    assert profile["available_minutes_per_day"] == 45

    # 3. Goals, assessments, preferences, llm_context
    assert adapted["goals"] == ["Master algorithms", "Learn FastAPI"]
    assert len(adapted["assessments"]) == 1
    assert adapted["assessments"][0] == {
        "assignment_id": 101,
        "score": 18.0,
        "max_score": 20.0,
        "percentage": 90.0,
        "completed_at": "2026-10-20T10:00:00",
    }
    assert adapted["preferences"] == {
        "study_mode": "hands-on",
        "available_minutes_per_day": 45,
    }
    assert adapted["average_percentage"] == 90.0
    assert adapted["llm_context"] == "Jane is a 3rd Year CS student with 90% average."


def test_adapt_student_context_minimal_and_optional_fields():
    """Verify minimal StudentContext maps safely without missing-field crashes or invented data."""
    context = StudentContext(
        student_id=42,
        full_name="Bob",
        llm_context="Minimal student context.",
    )

    adapted = adapt_student_context(context)

    assert adapted["student_id"] == "42"
    assert adapted["is_synthetic"] is False
    assert adapted["profile"]["full_name"] == "Bob"
    assert adapted["profile"]["first_name"] == "Bob"
    assert "field_of_study" not in adapted["profile"]
    assert "academic_year" not in adapted["profile"]
    assert adapted["profile"]["profile_completed"] is False
    assert adapted["goals"] == []
    assert adapted["assessments"] == []
    assert adapted["preferences"] == {}
    assert "average_percentage" not in adapted
    assert adapted["llm_context"] == "Minimal student context."
