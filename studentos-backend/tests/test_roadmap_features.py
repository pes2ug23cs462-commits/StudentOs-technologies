from unittest.mock import patch
from app.mentor.roadmap_service import RoadmapService, generate_and_save_roadmap_draft

@patch("app.mentor.roadmap_service.generate_json_response")
def test_full_llm_to_roadmap_service_connection(mock_generate_json):
    # Mock response from Groq LLM provider
    mock_generate_json.return_value = {
        "title": "Machine Learning Fundamentals",
        "description": "Step by step AI/ML path",
        "milestones": ["Linear Algebra", "PyTorch", "Model Deployment"]
    }

    service = RoadmapService()
    student_id = "student_ashish_101"

    # 1. Call connector -> triggers LLM generation and creates Draft
    draft = generate_and_save_roadmap_draft(
        student_id=student_id,
        user_goal_prompt="I want to learn AI Engineering",
        service=service
    )

    assert draft["status"] == "DRAFT"
    assert draft["content"]["title"] == "Machine Learning Fundamentals"

    # 2. Approve draft -> changes state to ACTIVE
    active_roadmap = service.approve_roadmap(draft["roadmap_id"])
    assert active_roadmap["status"] == "ACTIVE"
    assert service.get_active_roadmap(student_id)["roadmap_id"] == draft["roadmap_id"]