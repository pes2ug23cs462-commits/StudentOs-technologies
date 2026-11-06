from app.mentor.graph import run_mentor_workflow

context = {
    "profile": {"available_minutes_per_day": 60},
    "goals": ["Learn Python"],
}

first = run_mentor_workflow(
    student_id="test_student_01",
    message="Create a beginner Python roadmap",
    student_context=context,
)

second = run_mentor_workflow(
    student_id="test_student_01",
    message="Make my existing roadmap shorter and add more practice",
    student_context=context,
    conversation_state=first["conversation_state"],
)

print("STATUS:", second["status"])
print("INTENT:", second["intent"])
print("DRAFT SAVED:", bool(second.get("conversation_state", {}).get("roadmap_draft")))
structured = second.get("structured_output") or {}

print("REVISED TITLE:", structured.get("title"))
print("REVISION STATUS:", second.get("status"))
print("REVISION RESPONSE:", second.get("response"))

print("CREATE INTENT:", first.get("intent"))
print("REVISION INTENT:", second.get("intent"))
print("REVISION STATUS:", second.get("status"))
print("REVISED TITLE:", (second.get("structured_output") or {}).get("title"))