from unittest.mock import patch
from app.mentor.roadmap_service import (
    RoadmapService,
    RoadmapStatus,
    generate_and_save_roadmap_draft,
)


# =====================================================================
# 1. ROADMAP APPROVAL & MANAGEMENT TESTS
# =====================================================================

def test_roadmap_approval_flow():
    service = RoadmapService()
    student_id = "student_123"
    content = {"title": "Python Basics", "tasks": []}

    # 1. Creation starts in DRAFT
    draft = service.create_roadmap_draft(student_id, content)
    assert draft["status"] == RoadmapStatus.DRAFT.value
    assert service.get_active_roadmap(student_id) is None

    # 2. Approve draft -> becomes ACTIVE
    approved = service.approve_roadmap(draft["roadmap_id"])
    assert approved["status"] == RoadmapStatus.ACTIVE.value
    assert service.get_active_roadmap(student_id)["roadmap_id"] == draft["roadmap_id"]


def test_roadmap_rejection_flow():
    service = RoadmapService()
    student_id = "student_456"
    content = {"title": "Data Science Path"}

    draft = service.create_roadmap_draft(student_id, content)
    rejected = service.reject_roadmap(draft["roadmap_id"])

    assert rejected["status"] == RoadmapStatus.REJECTED.value
    # Ensure rejected roadmap cannot become active
    assert service.get_active_roadmap(student_id) is None
    assert service.approve_roadmap(draft["roadmap_id"]) is None


def test_superseding_old_active_roadmap():
    service = RoadmapService()
    student_id = "student_789"

    # Create & Approve Version 1
    draft_1 = service.create_roadmap_draft(student_id, {"title": "V1"})
    service.approve_roadmap(draft_1["roadmap_id"])

    # Create & Approve Version 2
    draft_2 = service.create_roadmap_draft(student_id, {"title": "V2"})
    service.approve_roadmap(draft_2["roadmap_id"])

    # Check V1 is SUPERSEDED and V2 is ACTIVE
    assert service.get_roadmap_by_id(draft_1["roadmap_id"])["status"] == RoadmapStatus.SUPERSEDED.value
    assert service.get_active_roadmap(student_id)["roadmap_id"] == draft_2["roadmap_id"]


# =====================================================================
# 2. PROGRESS TRACKING TESTS (RESPONSIBILITY #3)
# =====================================================================

def test_calculate_progress_partial_completion():
    service = RoadmapService()
    progress_data = {
        "tasks": [
            {"id": "t1", "completed": True},
            {"id": "t2", "completed": True},
            {"id": "t3", "completed": False},
            {"id": "t4", "completed": False},
            {"id": "t5", "completed": False},
            {"id": "t6", "completed": False},
            {"id": "t7", "completed": False},
            {"id": "t8", "completed": False},
            {"id": "t9", "completed": False},
            {"id": "t10", "completed": False},
        ],
        "milestones": [
            {"id": "m1", "completed": True},
            {"id": "m2", "completed": False},
        ],
    }

    result = service.calculate_progress(progress_data)

    assert result["total_tasks"] == 10
    assert result["completed_tasks"] == 2
    assert result["pending_tasks"] == 8
    assert result["completion_percentage"] == 20.0
    assert result["total_milestones"] == 2
    assert result["completed_milestones"] == 1
    assert result["pending_milestones"] == 1


def test_calculate_progress_zero_tasks():
    service = RoadmapService()
    progress_data = {"tasks": [], "milestones": []}

    result = service.calculate_progress(progress_data)

    assert result["total_tasks"] == 0
    assert result["completed_tasks"] == 0
    assert result["pending_tasks"] == 0
    assert result["completion_percentage"] == 0.0


def test_calculate_progress_invalid_or_none_data():
    service = RoadmapService()

    result_none = service.calculate_progress(None)
    assert result_none["total_tasks"] == 0
    assert result_none["completion_percentage"] == 0.0

    result_invalid = service.calculate_progress("invalid string input")
    assert result_invalid["total_tasks"] == 0
    assert result_invalid["completion_percentage"] == 0.0


# =====================================================================
# 3. GROQ LLM INTEGRATION CONNECTOR TEST
# =====================================================================

@patch("app.mentor.roadmap_service.generate_json_response")
def test_full_llm_to_roadmap_service_connection(mock_generate_json):
    mock_generate_json.return_value = {
        "title": "Machine Learning Fundamentals",
        "description": "Step by step AI/ML path",
        "milestones": ["Linear Algebra", "PyTorch", "Model Deployment"],
    }

    service = RoadmapService()
    student_id = "student_ashish_101"

    draft = generate_and_save_roadmap_draft(
        student_id=student_id,
        user_goal_prompt="I want to learn AI Engineering",
        service=service,
    )

    assert draft["status"] == "DRAFT"
    assert draft["content"]["title"] == "Machine Learning Fundamentals"

    active_roadmap = service.approve_roadmap(draft["roadmap_id"])
    assert active_roadmap["status"] == "ACTIVE"
    assert service.get_active_roadmap(student_id)["roadmap_id"] == draft["roadmap_id"]