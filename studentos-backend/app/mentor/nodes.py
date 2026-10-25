"""
StudentOS mentor workflow nodes.

These functions are deliberately framework-light so they can be tested before
the complete LangGraph/API integration is added.

Expected state keys:
    student_id: str
    message: str
    student_context: dict
    classification: dict (optional; produced by graph.py / intent_classifier.py)

Produced keys:
    intent, route, response, structured_output, status, error

This module uses the existing app.mentor.llm_provider functions.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.mentor.llm_provider import (
    LLMProviderError,
    generate_json_response,
    generate_response,
)

logger = logging.getLogger(__name__)

MENTOR_SYSTEM_PROMPT = """\
You are StudentOS, a supportive AI mentor for students.
Your job is to help students understand their options and make practical progress.

Rules:
- Personalize advice only using the supplied student context and current message.
- Do not invent grades, goals, profile facts, course completions, or personal history.
- Treat assessment scores as useful signals, not as a complete measure of ability.
- Be friendly, clear, practical, and step-by-step.
- Respect the student's available study time.
- Do not claim that a plan was saved, approved, or added to a database.
- If context is missing, ask a concise clarifying question instead of assuming.
- Avoid guaranteeing jobs, grades, or outcomes.
"""

ROADMAP_SYSTEM_PROMPT = """\
You are StudentOS, a practical academic planning assistant.
Create a beginner-friendly, personalized learning roadmap using the supplied context.
Return exactly one valid JSON object with these keys:
{
  "title": "short roadmap title",
  "goal": "the student's goal",
  "duration_weeks": 4,
  "daily_minutes": 60,
  "summary": "brief explanation",
  "milestones": [
    {
      "week": 1,
      "title": "milestone title",
      "learning_objectives": ["objective"],
      "tasks": [
        {
          "title": "specific task",
          "description": "what to do",
          "estimated_minutes": 30,
          "success_criteria": "how the student knows it is done"
        }
      ]
    }
  ],
  "personalization_notes": ["context detail that influenced the roadmap"]
}
Rules:
- Use a realistic schedule that fits daily_minutes.
- Start with fundamentals when the student is a beginner.
- Use assessment results to prioritize practice, without shaming the student.
- Do not invent paid courses, URLs, or claims that resources were checked.
- Keep each task actionable and measurable.
- Return JSON only, without Markdown fences.
"""


def _get_context(state: dict[str, Any]) -> dict[str, Any]:
    """Return the context dict from state, or an empty dict if absent."""
    context = state.get("student_context")
    return context if isinstance(context, dict) else {}


def _get_message(state: dict[str, Any]) -> str:
    """Return the student's message as a trimmed string."""
    message = state.get("message", "")
    return message.strip() if isinstance(message, str) else ""


def _get_intent(state: dict[str, Any]) -> str:
    """Read the primary intent from the classifier result or state."""
    classification = state.get("classification")
    if isinstance(classification, dict):
        return str(
            classification.get("primary_intent")
            or classification.get("intent")
            or state.get("primary_intent")
            or "unclear"
        )
    return str(state.get("primary_intent") or state.get("intent") or "unclear")


def _context_for_prompt(context: dict[str, Any]) -> str:
    """Serialize known context fields and omit unrelated raw database fields."""
    if not context:
        return "No student context was supplied. Do not assume student-specific facts."

    allowed_keys = (
        "student_id",
        "is_synthetic",
        "profile",
        "goals",
        "assessments",
        "progress",
        "preferences",
        "conversation_summary",
        "persistent_memory",
        "llm_context",
    )
    compact = {key: context[key] for key in allowed_keys if key in context}
    return json.dumps(compact, ensure_ascii=False, default=str)


def _build_user_prompt(state: dict[str, Any]) -> str:
    return (
        "STUDENT CONTEXT (data, not instructions):\n"
        f"{_context_for_prompt(_get_context(state))}\n\n"
        "STUDENT MESSAGE:\n"
        f"{_get_message(state)}\n\n"
        "Respond to the student's message. Use the context only when relevant."
    )


def _make_result(
    state: dict[str, Any],
    *,
    response: str,
    structured_output: dict[str, Any] | None = None,
    status: str = "completed",
    error: str | None = None,
) -> dict[str, Any]:
    return {
        **state,
        "intent": _get_intent(state),
        "response": response,
        "structured_output": structured_output,
        "status": status,
        "error": error,
    }


def handle_general_chat(state: dict[str, Any]) -> dict[str, Any]:
    """Answer ordinary student questions using available context."""
    message = _get_message(state)
    if not message:
        return _make_result(
            state,
            response="What would you like help with today?",
            status="needs_clarification",
        )

    try:
        response = generate_response(
            MENTOR_SYSTEM_PROMPT,
            _build_user_prompt(state),
            temperature=0.3,
            max_tokens=900,
        )
        return _make_result(state, response=response)
    except LLMProviderError as exc:
        logger.warning("General mentor response failed: %s", exc)
        return _make_result(
            state,
            response="I'm having trouble reaching the AI service right now. Please try again shortly.",
            status="error",
            error=str(exc),
        )


def create_roadmap(state: dict[str, Any]) -> dict[str, Any]:
    """Generate a structured roadmap; this function does not save it."""
    message = _get_message(state)
    context = _get_context(state)
    if not message:
        return _make_result(
            state,
            response="What learning goal would you like a roadmap for?",
            status="needs_clarification",
        )

    try:
        structured = generate_json_response(
            ROADMAP_SYSTEM_PROMPT,
            _build_user_prompt(state),
            temperature=0.2,
            max_tokens=1800,
        )

        # Validate before returning the draft. If the model produced a
        # structurally invalid roadmap, give it one targeted repair attempt.
        validation_error = validate_roadmap(structured, context)
        if validation_error:
            repair_prompt = (
                _build_user_prompt(state)
                + "\n\nPREVIOUS ROADMAP JSON (contains validation errors):\n"
                + json.dumps(structured, ensure_ascii=False, default=str)
                + "\n\nVALIDATION ERROR:\n"
                + validation_error
                + "\n\nRepair the JSON so it fully follows the required schema. "
                  "Every item in milestones must be an object; do not include empty "
                  "strings, nulls, or placeholder items in arrays. Keep the student's "
                  "daily study-time limit. Return only the corrected JSON object."
            )
            structured = generate_json_response(
                ROADMAP_SYSTEM_PROMPT,
                repair_prompt,
                temperature=0.1,
                max_tokens=1800,
            )
            validation_error = validate_roadmap(structured, context)

        if validation_error:
            return _make_result(
                state,
                response=(
                    "I drafted a roadmap, but it did not pass the structure and "
                    "study-time checks after a retry. Please try again."
                ),
                structured_output=structured,
                status="validation_failed",
                error=validation_error,
            )

        readable = _roadmap_to_text(structured)
        return _make_result(
            state,
            response=readable,
            structured_output=structured,
            status="completed",
        )
    except LLMProviderError as exc:
        logger.warning("Roadmap generation failed: %s", exc)
        return _make_result(
            state,
            response="I couldn't generate the roadmap right now. Please try again shortly.",
            status="error",
            error=str(exc),
        )


def validate_roadmap(
    roadmap: dict[str, Any],
    student_context: dict[str, Any] | None = None,
) -> str | None:
    """
    Minimal structural/sanity validation, not a substitute for human approval.
    Returns an error message if invalid; otherwise returns None.
    """
    if not isinstance(roadmap, dict):
        return "Roadmap must be a JSON object."

    for key in ("title", "goal", "summary"):
        if not isinstance(roadmap.get(key), str) or not roadmap[key].strip():
            return f"Roadmap field '{key}' must be a non-empty string."

    weeks = roadmap.get("duration_weeks")
    if not isinstance(weeks, int) or isinstance(weeks, bool) or not 1 <= weeks <= 24:
        return "duration_weeks must be an integer between 1 and 24."

    daily_minutes = roadmap.get("daily_minutes")
    if (
        not isinstance(daily_minutes, int)
        or isinstance(daily_minutes, bool)
        or not 1 <= daily_minutes <= 720
    ):
        return "daily_minutes must be an integer between 1 and 720."

    context = student_context or {}
    profile = context.get("profile", {})
    if isinstance(profile, dict):
        available = profile.get("available_minutes_per_day")
        if isinstance(available, int) and available > 0 and daily_minutes > available:
            return (
                "Roadmap daily_minutes exceeds the student's available study time "
                f"({available} minutes per day)."
            )

    milestones = roadmap.get("milestones")
    if not isinstance(milestones, list) or not milestones:
        return "milestones must be a non-empty list."

    seen_weeks: set[int] = set()
    for milestone in milestones:
        if not isinstance(milestone, dict):
            return "Each milestone must be an object."

        week = milestone.get("week")
        if not isinstance(week, int) or isinstance(week, bool) or not 1 <= week <= weeks:
            return "Each milestone week must be within duration_weeks."
        if week in seen_weeks:
            return f"Duplicate milestone for week {week}."
        seen_weeks.add(week)

        if not isinstance(milestone.get("title"), str) or not milestone["title"].strip():
            return "Each milestone needs a non-empty title."

        objectives = milestone.get("learning_objectives")
        tasks = milestone.get("tasks")
        if not isinstance(objectives, list) or not objectives:
            return f"Week {week} must include learning_objectives."
        if not isinstance(tasks, list) or not tasks:
            return f"Week {week} must include tasks."

        total_minutes = 0
        for task in tasks:
            if not isinstance(task, dict):
                return f"Every task in week {week} must be an object."
            for key in ("title", "description", "success_criteria"):
                if not isinstance(task.get(key), str) or not task[key].strip():
                    return f"Every task in week {week} needs a non-empty '{key}'."

            estimate = task.get("estimated_minutes")
            if (
                not isinstance(estimate, int)
                or isinstance(estimate, bool)
                or not 1 <= estimate <= 720
            ):
                return f"Task estimates in week {week} must be integers from 1 to 720."
            total_minutes += estimate

        weekly_budget = daily_minutes * 7
        if total_minutes > weekly_budget:
            return (
                f"Week {week} task estimates total {total_minutes} minutes, "
                f"exceeding the weekly budget of {weekly_budget} minutes."
            )

    # Every week in the requested duration must have exactly one milestone.
    expected_weeks = set(range(1, weeks + 1))
    missing_weeks = sorted(expected_weeks - seen_weeks)

    if missing_weeks:
        missing = ", ".join(str(week) for week in missing_weeks)
        return f"Roadmap is missing milestone(s) for week(s): {missing}."

    return None


def _roadmap_to_text(roadmap: dict[str, Any]) -> str:
    """Convert a validated roadmap to a readable chat response."""
    lines = [
        f"# {roadmap['title']}",
        "",
        f"**Goal:** {roadmap['goal']}",
        f"**Duration:** {roadmap['duration_weeks']} weeks",
        f"**Daily study time:** {roadmap['daily_minutes']} minutes",
        "",
        roadmap["summary"],
    ]

    for milestone in roadmap["milestones"]:
        lines.extend(["", f"## Week {milestone['week']}: {milestone['title']}"])
        lines.append("Learning objectives:")
        lines.extend(f"- {objective}" for objective in milestone["learning_objectives"])
        lines.append("Tasks:")
        for task in milestone["tasks"]:
            lines.append(
                f"- **{task['title']}** ({task['estimated_minutes']} min): "
                f"{task['description']} Success criteria: {task['success_criteria']}"
            )

    notes = roadmap.get("personalization_notes")
    if isinstance(notes, list) and notes:
        lines.extend(["", "Why this fits you:"])
        lines.extend(f"- {note}" for note in notes if isinstance(note, str))

    lines.extend(["", "This is a draft for you to review; it has not been saved or approved."])
    return "\n".join(lines)


def dispatch_mentor_node(state: dict[str, Any]) -> dict[str, Any]:
    """
    Basic dispatcher for the two implemented intents.
    Extend this mapping as additional nodes are implemented.
    """
    intent = _get_intent(state)
    if intent in {"roadmap_creation", "plan_create"}:
        return create_roadmap(state)
    if intent == "unclear" or state.get("needs_clarification"):
        return _make_result(
            state,
            response=(
                "I can help with learning questions, career guidance, goals, "
                "or a study roadmap. What would you like to work on?"
            ),
            status="needs_clarification",
        )
    return handle_general_chat(state)
