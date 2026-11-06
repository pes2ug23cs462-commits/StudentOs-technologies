"""
StudentOS Mentor Orchestrator
-----------------------------
Classifies a student message, builds mentor state, and dispatches it to the
appropriate response node.

This module does not fetch student context from the database or persist/approve
plans. The authenticated API layer should fetch authorized context and pass it
to run_mentor_workflow(); persistence and approval remain separate services.
"""

from __future__ import annotations

import logging
from typing import Any
from copy import deepcopy

from app.mentor.intent_classifier import classify_intent
from app.mentor.nodes import dispatch_mentor_node
from app.mentor.context_engine import build_context_snapshot

logger = logging.getLogger(__name__)


SUPPORTED_INTENTS = {
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


def route_intent(intent: str) -> str:
    """Map a classified intent to a workflow identifier."""
    routes = {
        "general_chat": "mentor_conversation",
        "goal_setting": "mentor_conversation",
        "career_guidance": "mentor_conversation",
        "learning_help": "mentor_conversation",
        "motivation_support": "mentor_conversation",
        "roadmap_creation": "roadmap_workflow",
        "roadmap_update": "roadmap_workflow",
        "roadmap_view": "roadmap_workflow",
        "resource_recommendation": "resource_workflow",
        "task_management": "task_workflow",
        "plan_create": "plan_workflow",
        "plan_update": "plan_workflow",
        "plan_view": "plan_workflow",
        "progress_query": "progress_workflow",
        "recovery_plan": "recovery_workflow",
        "profile_update": "learner_context_update",
        "unclear": "clarification",
    }
    return routes.get(intent, "clarification")


def build_mentor_state(
    student_id: str,
    message: str,
    student_context: dict[str, Any] | None = None,
    conversation_state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Build initial state for a mentor request.

    student_id must come from the authenticated API request. student_context
    must already be fetched and authorized by the backend.
    """
    if not isinstance(student_id, str) or not student_id.strip():
        raise ValueError("student_id is required")

    if not isinstance(message, str) or not message.strip():
        raise ValueError("message cannot be empty")

    if student_context is not None and not isinstance(student_context, dict):
        raise ValueError("student_context must be a dictionary when provided")

    if conversation_state is not None and not isinstance(conversation_state, dict):
        raise ValueError("conversation_state must be a dictionary when provided")

    classification = classify_intent(message)
    if not isinstance(classification, dict):
        logger.error("Intent classifier returned an unexpected result type")
        classification = {"intent": "unclear", "needs_clarification": True}

    primary_intent = classification.get(
        "primary_intent",
        classification.get("intent", "unclear"),
    )
    if not isinstance(primary_intent, str) or primary_intent not in SUPPORTED_INTENTS:
        logger.warning(
            "Unsupported classifier intent %r; routing to clarification",
            primary_intent,
        )
        primary_intent = "unclear"

    secondary_intents = classification.get("secondary_intents", [])
    if not isinstance(secondary_intents, list):
        secondary_intents = []

    entities = classification.get("entities", {})
    if not isinstance(entities, dict):
        entities = {}


    # Normalize student context before passing it to mentor nodes.
    # Roadmap creation requires the student's daily available study time.
    is_roadmap_request = primary_intent in {"roadmap_creation", "plan_create"}

    context_snapshot = build_context_snapshot(
        student_context,
        require_available_time=is_roadmap_request,
    )

    normalized_context = context_snapshot["context"]

    # The request's student_id is authoritative.
    normalized_context["student_id"] = student_id.strip()

    # Preserve caller-managed conversation state without mutating its input.
    normalized_conversation_state = deepcopy(conversation_state or {})

    return {
        "student_id": student_id.strip(),
        "message": message.strip(),
        "student_context": normalized_context,
        "context_snapshot": context_snapshot,
        "conversation_state": normalized_conversation_state,
        "missing_context_fields": context_snapshot["missing_fields"],
        "context_complete": context_snapshot["is_complete"],
        "classification": classification,
        "primary_intent": primary_intent,
        "secondary_intents": secondary_intents,
        "entities": entities,
        "route": route_intent(primary_intent),
        "needs_clarification": (
            bool(classification.get("needs_clarification"))
            or bool(context_snapshot["missing_fields"])
        ),
        "status": "classified",
        "response": None,
        "error": None,
    }


def run_mentor_router(
    student_id: str,
    message: str,
    student_context: dict[str, Any] | None = None,
    conversation_state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Backward-compatible classification-only entry point.

    Use run_mentor_workflow() when you want to execute the LLM node as well.
    """
    state = build_mentor_state(
        student_id=student_id,
        message=message,
        student_context=student_context,
        conversation_state=conversation_state,
    )
    logger.info(
        "Mentor request classified: student_id=%s intent=%s route=%s",
        state["student_id"],
        state["primary_intent"],
        state["route"],
    )
    return state


def run_mentor_workflow(
    student_id: str,
    message: str,
    student_context: dict[str, Any] | None = None,
    conversation_state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Execute the initial end-to-end mentor workflow:
    validate input -> classify intent -> dispatch node -> return result.

    This does not save a generated roadmap. Roadmaps remain drafts until the
    separate approval/persistence workflow is integrated.
    """
    state = build_mentor_state(
        student_id=student_id,
        message=message,
        student_context=student_context,
        conversation_state=conversation_state,
    )

    logger.info(
        "Executing mentor workflow: student_id=%s intent=%s route=%s",
        state["student_id"],
        state["primary_intent"],
        state["route"],
    )

    try:
        result = dispatch_mentor_node(state)
        if not isinstance(result, dict):
            raise TypeError("dispatch_mentor_node must return a dictionary")

        # Keep essential workflow metadata available even if a node omitted it.
        result.setdefault("student_id", state["student_id"])
        result.setdefault("message", state["message"])
        result.setdefault("classification", state["classification"])
        result.setdefault("primary_intent", state["primary_intent"])
        result.setdefault("secondary_intents", state["secondary_intents"])
        result.setdefault("entities", state["entities"])
        result.setdefault("route", state["route"])

        logger.info(
            "Mentor workflow finished: student_id=%s status=%s intent=%s",
            result.get("student_id"),
            result.get("status"),
            result.get("primary_intent"),
        )
        return result

    except ValueError:
        # Invalid input should remain a clear client-side validation error.
        raise
    except Exception as exc:
        logger.exception(
            "Mentor workflow failed for student_id=%s",
            state["student_id"],
        )
        return {
            **state,
            "status": "error",
            "response": "The mentor workflow could not complete this request.",
            "error": str(exc),
        }
