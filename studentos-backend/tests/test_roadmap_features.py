import pytest
from app.mentor.roadmap_service import RoadmapService, RoadmapStatus

def test_roadmap_approval_flow():
    service = RoadmapService()
    service.save_roadmap("rm_1", "student_101", "Python Basics", [{"title": "Task 1"}])
    
    # Check starts as DRAFT
    assert service.get_roadmap_by_id("rm_1")["status"] == RoadmapStatus.DRAFT
    assert service.get_active_roadmap("student_101") is None
    
    # Approve and verify it becomes ACTIVE
    res = service.approve_roadmap("rm_1")
    assert res["status"] == RoadmapStatus.ACTIVE
    assert service.get_active_roadmap("student_101")["roadmap_id"] == "rm_1"

def test_roadmap_rejection():
    service = RoadmapService()
    service.save_roadmap("rm_2", "student_102", "ML Fundamentals", [])
    service.reject_roadmap("rm_2")
    
    # Verify status is REJECTED
    assert service.get_roadmap_by_id("rm_2")["status"] == RoadmapStatus.REJECTED
    assert service.get_active_roadmap("student_102") is None