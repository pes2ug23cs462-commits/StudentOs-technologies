"""
StudentOS Intent Classifier
===========================

Production-oriented intent classification module for the StudentOS mentor pipeline.

Features
- Rule-based classification for common English and Hinglish requests.
- Multi-intent detection with message-order preservation.
- Entity extraction for topics, career goals, availability, and task deadlines.
- Optional Groq fallback for ambiguous messages.
- Stable compatibility fields: `intent`, `secondary_intents`, `reason`, `actions`.
- Additional routing fields: `primary_intent`, `intents`, and `route`.
- Safe fallback on empty messages, malformed LLM output, and provider failures.

Important
- This module classifies requests; it does NOT execute actions.
- Verify the route names against the handlers implemented in your backend.
- Confidence values are heuristic rule scores, not calibrated probabilities.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Intent registry
# ---------------------------------------------------------------------------

INTENT_TO_ROUTE: dict[str, str] = {
    "general_chat": "mentor_conversation",
    "goal_setting": "mentor_conversation",
    "career_guidance": "mentor_conversation",
    "learning_help": "mentor_conversation",
    "motivation_support": "mentor_conversation",
    "roadmap_creation": "roadmap_workflow",
    "roadmap_update": "roadmap_workflow",
    "roadmap_approval": "roadmap_workflow",
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

INTENT_TO_ACTION: dict[str, str] = {
    "general_chat": "respond_to_message",
    "goal_setting": "help_define_goal",
    "career_guidance": "provide_career_guidance",
    "learning_help": "answer_learning_question",
    "motivation_support": "provide_motivation_support",
    "roadmap_creation": "create_roadmap",
    "roadmap_update": "update_roadmap",
    "roadmap_approval": "approve_roadmap",
    "roadmap_view": "view_roadmap",
    "resource_recommendation": "recommend_resources",
    "task_management": "manage_task",
    "plan_create": "create_study_plan",
    "plan_update": "update_study_plan",
    "plan_view": "view_study_plan",
    "progress_query": "get_progress",
    "recovery_plan": "propose_recovery_plan",
    "profile_update": "update_learner_context",
    "unclear": "ask_clarifying_question",
}

# Patterns are evaluated independently; the earliest matching phrase determines
# request order. Broad patterns are deliberately kept narrower than action ones.
PATTERNS: dict[str, list[str]] = {
    "general_chat": [
        r"^(hi+|hello+|hey+|namaste|good morning|good afternoon|good evening)[!. ]*$",
        r"^(how are you|kaise ho)[?! .]*$",
        r"^(thanks|thank you|thankyou|shukriya)[!. ]*$",
    ],
    "goal_setting": [
        r"\b(help me|help me to|let's|lets)\b.{0,45}\b(set|define|choose|figure out)\b.{0,30}\b(goals?|career goals?)\b",
        r"\b(set|define|create|choose)\b.{0,30}\b(my )?(career )?goals?\b",
        r"\bi don't know\b.{0,35}\b(goal|career path|what to do)\b",
    ],
    "career_guidance": [
        r"\bi want to become\b",
        r"\bi wanna become\b",
        r"\bi want to be a?\b.{0,25}\b(data scientist|data analyst|ml engineer|ai engineer|software engineer|developer)\b",
        r"\bcareer guidance\b",
        r"\bcareer advice\b",
        r"\bwhich career\b",
        r"\bcareer path\b",
        r"\bwhat career should i\b",
    ],
    "motivation_support": [
        r"\b(feel|feeling) stuck\b",
        r"\bneed motivation\b",
        r"\bno motivation\b",
        r"\bi feel demotivated\b",
        r"\bi want to give up\b",
        r"\bi can't focus\b",
        r"\bi am overwhelmed\b",
        r"\bi feel lost\b",
    ],
    "recovery_plan": [
        r"\bmissed?\b.{0,45}\b(session|class|study|task|day)s?\b",
        r"\bcatch up\b",
        r"\bfalling behind\b",
        r"\brecovery plan\b",
        r"\badjust\b.{0,25}\b(my )?(study )?plan\b",
        r"\b(reschedule|recover)\b.{0,35}\b(plan|session|study)\b",
        r"\bsessions? nahi ki\b",
        r"\bpeeche reh\b",
    ],
    "task_management": [
        r"\b(add|create|make|schedule|assign|delete|remove|complete|finish|mark)\b.{0,55}\b(task|tasks|todo|to-do|reminder)\b",
        r"\b(remind me to)\b",
        r"\b(show|list|view)\b.{0,30}\b(my )?(pending )?(tasks|todos|to-dos)\b",
        r"\btask\b.{0,30}\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    ],

    "roadmap_approval": [
        r"\b(approve|confirm|accept|activate|finalize)\b.{0,45}\b(my )?(learning )?roadmap\b",
        r"\b(my )?(learning )?roadmap\b.{0,35}\b(approve|confirm|accept|activate|finalize)\b",
        r"\bi approve\b.{0,30}\b(plan|roadmap)\b",
    ],
    "roadmap_update": [
    # Direct update requests
        r"\b(update|change|modify|reorder|edit|remove|add|revise|shorten|expand|simplify)\b.{0,45}\b(my )?(existing )?(learning )?(roadmap|learning path)\b",

    # Requests that mention the roadmap first
        r"\b(my )?(existing )?(roadmap|learning path)\b.{0,45}\b(update|change|modify|edit|remove|add|revise|shorten|expand|simplify)\b",

    # Natural language: "Make my existing roadmap shorter"
        r"\b(make|keep)\s+my\s+(existing\s+)?(learning\s+)?(roadmap|learning path)\b.{0,45}\b(shorter|longer|simpler|easier|harder|more detailed|more practice)\b",

    # Natural language: "Make it shorter" when roadmap is mentioned
        r"\b(make|keep)\b.{0,35}\b(shorter|longer|simpler|easier|harder)\b.{0,35}\b(roadmap|learning path)\b",
    ],
    "roadmap_creation": [
        r"\b(create|make|build|generate|prepare|design)\b.{0,45}\b(learning )?roadmap\b",
        r"\broadmap\b.{0,35}\b(create|make|build|generate|bana|banao)\b",
        r"\b(learning|learn|study)\b.{0,35}\broadmap\b",
        r"\broadmap\b.{0,30}\bfor learning\b",
        r"\broadmap banana\b",
        r"\broadmap banao\b",
    ],
    "roadmap_view": [
        r"\b(show|view|display|see|check)\b.{0,35}\b(my )?(learning )?roadmap\b",
        r"\b(my|the) roadmap\b",
    ],
    "resource_recommendation": [
        r"\b(recommend|suggest|find|show me|give me|share)\b.{0,40}\b(free )?(courses?|resources?|tutorials?|videos?|books?)\b",
        r"\b(courses?|resources?|tutorials?)\b.{0,30}\b(recommend|suggest|for learning)\b",
        r"\bfree courses\b",
    ],
    "plan_update": [
        r"\b(update|change|modify|adjust|reschedule|shift)\b.{0,40}\b(my )?(study )?(plan|schedule|timetable)\b",
        r"\b(plan|schedule|timetable)\b.{0,35}\b(change|adjust|modify|reschedule)\b",
    ],
    "plan_create": [
        r"\b(create|make|generate|build|prepare|start)\b.{0,45}\b(my )?(daily |weekly )?(study )?plan\b",
        r"\b(daily|weekly) study plan\b",
        r"\bplan bana\b",
        r"\bplan banao\b",
        r"\bkal se\b.{0,30}\b(study|padhai)\b.{0,25}\b(plan|start)\b",
        r"\bkal se study plan start karna hai\b",
        r"\bi need a study plan\b",
    ],
    "plan_view": [
        r"\b(show|view|display|see|check)\b.{0,35}\b(my )?(study )?(plan|schedule|timetable)\b",
        r"\bwhat is my (study )?(plan|schedule|timetable)\b",
    ],
    "progress_query": [
        r"\b(progress|progress report|how much have i done)\b",
        r"\bhow much\b.{0,35}\b(completed|finished|course|learning)\b",
        r"\bkitna\b.{0,25}\bcomplete\b",
    ],
    "profile_update": [
        r"\bi can study\b",
        r"\bi have\b.{0,20}\b(hours?|minutes?)\b.{0,20}\b(per day|daily|a day)\b",
        r"\bi am available\b",
        r"\bmy availability\b",
        r"\bchange my availability\b",
        r"\b(update|change|set)\b.{0,35}\b(my preferences|study time|availability)\b",
    ],
    "learning_help": [
        r"\b(explain|teach me|help me understand|meaning of|difference between)\b",
        r"\bwhat is\b",
        r"\bhow does\b",
        r"\bhow do i\b",
        r"\bhow can i\b.{0,45}\b(improve|learn|practice|practise|understand|prepare|get better)\b",
        r"\b(improve|get better at|practice|practise|strengthen)\b.{0,35}\b(my )?(skills?|knowledge|understanding|python|sql|programming|machine learning|data science)\b",
        r"\btips to\b.{0,25}\b(improve|learn|practice|practise)\b",
        r"\bsamjhao\b",
        r"\bsamjha do\b",
        r"\bkya hai\b",
        r"\bi wanna learn\b",
        r"\bi want to learn\b",
        r"\bi would like to learn\b",
    ],
}

TOPICS = (
    "machine learning", "deep learning", "data science", "computer vision",
    "linear algebra", "statistics", "python", "sql", "nlp", "overfitting",
    "data analysis", "generative ai", "llm", "rag", "pandas", "excel",
)

CAREER_ALIASES = {
    "data scientist": r"\bdata scientist\b",
    "data analyst": r"\bdata analyst\b",
    "machine learning engineer": r"\b(machine learning|ml) engineer\b",
    "ai engineer": r"\b(ai|artificial intelligence) engineer\b",
    "software engineer": r"\bsoftware engineer\b",
    "data engineer": r"\bdata engineer\b",
}


def normalize_message(message: str) -> str:
    """Normalize whitespace and casing."""
    return re.sub(r"\s+", " ", (message or "").strip().lower())


def extract_entities(message: str) -> dict[str, Any]:
    """Extract explicit entities; never infer a value that was not stated."""
    entities: dict[str, Any] = {}
    text = message or ""
    normalized = normalize_message(text)

    time_match = re.search(
        r"\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)\b",
        normalized,
        flags=re.IGNORECASE,
    )
    if time_match:
        amount = float(time_match.group(1))
        unit = time_match.group(2).lower()
        minutes = amount * 60 if unit.startswith(("hour", "hr")) else amount
        entities["available_minutes_per_day"] = int(minutes) if minutes.is_integer() else minutes

    days = re.findall(
        r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|kal)\b",
        normalized,
    )
    if days:
        entities["date_or_day_mentions"] = days
        if "tomorrow" in days or "kal" in days:
            entities["deadline_hint"] = "tomorrow"

    topics = [topic for topic in TOPICS if re.search(r"\b" + re.escape(topic) + r"\b", normalized)]
    if topics:
        entities["topics"] = topics
        entities["topic"] = topics[0]

    for career, pattern in CAREER_ALIASES.items():
        if re.search(pattern, normalized):
            entities["career_goal"] = career
            entities["target_career"] = career
            break

    if re.search(r"\b(i want to become|i wanna become|my goal is to become)\b", normalized):
        match = re.search(
            r"\b(?:i want to become|i wanna become|my goal is to become)\s+(?:a|an)?\s*(.+?)(?:[,.!?]|$)",
            text,
            flags=re.IGNORECASE,
        )
        if match and "career_goal" not in entities:
            entities["career_goal"] = match.group(1).strip()

    if re.search(r"\b(course|courses)\b", normalized):
        entities["resource_type"] = "courses"
    elif re.search(r"\b(book|books)\b", normalized):
        entities["resource_type"] = "books"
    elif re.search(r"\b(video|videos|tutorial|tutorials)\b", normalized):
        entities["resource_type"] = "tutorials"

    task_match = re.search(
        r"\b(?:add|create|make|schedule)\s+(?:a\s+)?(?:new\s+)?task\s+(?:to|for|called|named)\s+(.+?)(?:[.!?]|$)",
        text,
        flags=re.IGNORECASE,
    )
    if task_match:
        entities["task_description"] = task_match.group(1).strip()
    else:
        practise_match = re.search(
            r"\b(?:add|create|make)\s+a\s+task\s+to\s+(.+?)(?:\s+tomorrow|\s+today|[.!?]|$)",
            text,
            flags=re.IGNORECASE,
        )
        if practise_match:
            entities["task_description"] = practise_match.group(1).strip()

    return entities


def _find_intents(text: str) -> list[tuple[int, str, float]]:
    """Return matched intents ordered by where the request appears."""
    found: list[tuple[int, str, float]] = []
    for intent, patterns in PATTERNS.items():
        positions = []
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                positions.append(match.start())
        if positions:
            # Heuristic score only; do not treat as calibrated probability.
            found.append((min(positions), intent, 0.88))

    found.sort(key=lambda item: item[0])
    return found


def _classify_with_groq(message: str) -> Optional[dict[str, Any]]:
    """Optional LLM fallback. Only accepts intents defined by this module."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    try:
        from groq import Groq

        client = Groq(api_key=api_key, timeout=10.0, max_retries=1)
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        allowed = list(INTENT_TO_ROUTE)

        response = client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Classify the message for StudentOS. Do not execute actions. "
                        "Return JSON only with primary_intent, intents, entities, reason. "
                        f"Allowed intents: {allowed}. Preserve request order. "
                        "Use unclear if the request is too vague. Entities must be an object. "
                        "Do not invent entities."
                    ),
                },
                {"role": "user", "content": message},
            ],
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content or "{}")
        primary = data.get("primary_intent", "unclear")
        if primary not in INTENT_TO_ROUTE:
            return None

        intents = data.get("intents", [primary])
        if not isinstance(intents, list):
            intents = [primary]
        intents = [item for item in intents if item in INTENT_TO_ROUTE]
        if primary not in intents:
            intents.insert(0, primary)

        entities = data.get("entities", {})
        if not isinstance(entities, dict):
            entities = {}

        return {
            "primary_intent": primary,
            "intents": intents,
            "entities": entities,
            "reason": str(data.get("reason", "Classified using Groq fallback.")),
        }
    except Exception as exc:
        logger.warning("Groq intent fallback failed: %s", type(exc).__name__)
        return None


def classify_intent(
    message: str,
    student_context: Optional[dict[str, Any]] = None,
    use_groq: bool = False,
) -> dict[str, Any]:
    """
    Classify a message and return routing data.

    Compatibility fields retained:
      intent, confidence, method, needs_clarification, entities,
      secondary_intents, reason, actions

    Additional fields:
      primary_intent, intents, route

    `student_context` is accepted for pipeline compatibility. Do not use it as
    proof of identity; the API layer must provide authenticated student identity.
    """
    del student_context  # Reserved for future, privacy-conscious disambiguation.

    original = (message or "").strip()
    text = normalize_message(original)
    entities = extract_entities(original)

    if not text:
        return {
            "intent": "unclear",
            "primary_intent": "unclear",
            "confidence": 0.0,
            "method": "rules",
            "needs_clarification": True,
            "entities": {},
            "secondary_intents": [],
            "intents": ["unclear"],
            "reason": "Empty message.",
            "actions": [],
            "route": "clarification",
        }

    matches = _find_intents(text)
    method = "rules"
    reason = f"Detected {len(matches)} intent(s) using rules."
    intents = [intent for _, intent, _ in matches]
    scores = {intent: score for _, intent, score in matches}

    # A bare greeting is general chat; greeting words in a real request do not
    # displace the actual request.
    if intents == ["general_chat"]:
        primary = "general_chat"
    elif intents:
        # Remove learning_help as a spurious secondary intent for task actions
        # unless the user explicitly asks to learn/explain something as well.
        explicit_learning = any(
            re.search(pattern, text, re.IGNORECASE)
            for pattern in PATTERNS["learning_help"]
        )
        if "task_management" in intents and not explicit_learning:
            intents = [item for item in intents if item != "learning_help"]
        primary = intents[0]
    else:
        primary = "unclear"

    # Prevent conflicting roadmap intents from becoming secondary actions.
    if primary in (
        "roadmap_update",
        "roadmap_creation",
        "roadmap_approval",
    ):
        intents = [
            item for item in intents
            if item not in (
                "roadmap_update",
                "roadmap_creation",
                "roadmap_view",
                "roadmap_approval",
            )
        ]
        intents.insert(0, primary)

    # If rules cannot classify, optionally ask Groq. It is not called for every
    # message because that adds latency and cost and may override good rule matches.
    if primary == "unclear" and use_groq:
        llm_result = _classify_with_groq(original)
        if llm_result:
            primary = llm_result["primary_intent"]
            intents = llm_result["intents"]
            entities.update(llm_result["entities"])
            reason = llm_result["reason"]
            method = "groq"
            scores = {}

    if not intents or primary == "unclear":
        intents = ["unclear"]
        primary = "unclear"

    # Prevent conflicting roadmap intents from becoming secondary actions.


    # Ensure primary intent is first and remove duplicate intents, preserving order.
    intents = list(dict.fromkeys(intents))
    if primary in intents:
        intents.remove(primary)
    intents.insert(0, primary)

    needs_clarification = primary == "unclear"
    secondary_intents = intents[1:]

    actions = [
        {
            "intent": intent,
            "confidence": scores.get(intent, None),
            "entities": dict(entities),
            "reason": f"Detected request for {intent}.",
        }
        for intent in intents
        if intent != "unclear"
    ]

    return {
        # Legacy response contract:
        "intent": primary,
        "confidence": scores.get(primary, 0.88 if not needs_clarification else 0.2),
        "method": method,
        "needs_clarification": needs_clarification,
        "entities": entities,
        "secondary_intents": secondary_intents,
        "reason": (
            "The request is too vague to identify an action."
            if needs_clarification else reason
        ),
        "actions": actions,
        # Routing fields:
        "primary_intent": primary,
        "intents": intents,
        "route": INTENT_TO_ROUTE[primary],
    }


def run_tests() -> bool:
    """Regression tests for previous StudentOS examples."""
    cases = [
        ("Hi", "general_chat"),
        ("Help me set my career goals", "goal_setting"),
        ("I want to become a data scientist", "career_guidance"),
        (
            "I want to become a data scientist, find me relevant courses and also create a roadmap",
            "career_guidance",
        ),
        ("Create a roadmap for learning machine learning", "roadmap_creation"),
        ("Update my existing roadmap", "roadmap_update"),
        ("Explain overfitting", "learning_help"),
        ("How can I improve my Python skills?", "learning_help"),
        ("How can I improve my machine learning skills?", "learning_help"),
        ("I want to get better at SQL", "learning_help"),
        ("Recommend free Python courses", "resource_recommendation"),
        ("Add a task to practise SQL tomorrow", "task_management"),
        ("Create a roadmap and recommend courses", "roadmap_creation"),
        ("hiii, I wanna learn ML", "learning_help"),
        ("Help me", "unclear"),
        ("kal se study plan start karna hai", "plan_create"),
        ("I have 1 hour per day to learn Python", "profile_update"),
        ("I feel stuck and need motivation", "motivation_support"),
        ("Create a task and then show my roadmap", "task_management"),
        ("Show my roadmap and create a task", "roadmap_view"),
        ("Make my existing roadmap shorter and add more practice", "roadmap_update"),
        ("Shorten my roadmap", "roadmap_update"),
        ("Update my existing roadmap", "roadmap_update"),
        ("Approve my roadmap", "roadmap_approval"),
        ("I approve my learning roadmap", "roadmap_approval"),
        ("Please confirm my roadmap", "roadmap_approval"),
        ("Activate my roadmap", "roadmap_approval"),
    ]

    failures = 0
    for message, expected in cases:
        result = classify_intent(message)
        actual = result["intent"]
        ok = actual == expected
        print(
            f"{'PASS' if ok else 'FAIL'} | {message!r} | "
            f"expected={expected} actual={actual} | "
            f"secondary={result['secondary_intents']}"
        )
        if not ok:
            failures += 1

    print(f"\n{len(cases) - failures}/{len(cases)} tests passed")
    return failures == 0


if __name__ == "__main__":
    import sys

    if "--tests" in sys.argv:
        raise SystemExit(0 if run_tests() else 1)

    use_groq = "--groq" in sys.argv
    args = [arg for arg in sys.argv[1:] if arg != "--groq"]
    user_message = " ".join(args) if args else input("Student message: ")
    print(json.dumps(classify_intent(user_message, use_groq=use_groq), indent=2, ensure_ascii=False))
