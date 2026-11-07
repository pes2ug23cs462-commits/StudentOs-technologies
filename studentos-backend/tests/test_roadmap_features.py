import pytest
from app.services.roadmap_service import RoadmapService, RoadmapStatus
from app.services.progress_service import ProgressTracker

def test_roadmap_approval_flow():
    service = RoadmapService()
    service.save_roadmap("rm_1", "student_101", "Python Basics", [{"title": "Task 1"}])
    
    # Starts as DRAFT
    assert service.get_roadmap_by_id("rm_1")["status"] == RoadmapStatus.DRAFT
    assert service.get_active_roadmap("student_101") is None
    
    # Approve and check status
    res = service.approve_roadmap("rm_1")
    assert res["status"] == RoadmapStatus.ACTIVE
    assert service.get_active_roadmap("student_101")["roadmap_id"] == "rm_1"

def test_roadmap_rejection():
    service = RoadmapService()
    service.save_roadmap("rm_2", "student_102", "ML Fundamentals", [])
    service.reject_roadmap("rm_2")
    
    assert service.get_roadmap_by_id("rm_2")["status"] == RoadmapStatus.REJECTED
    assert service.get_active_roadmap("student_102") is None

def test_progress_calculation():
    tasks = [
        {"id": 1, "completed": True},
        {"id": 2, "completed": True},
        {"id": 3, "completed": False},
        {"id": 4, "completed": False},
        {"id": 5, "completed": False}
    ]
    res = ProgressTracker.calculate_progress(tasks)
    assert res["total_tasks"] == 5
    assert res["completed_tasks"] == 2
    assert res["pending_tasks"] == 3
    assert res["completion_percentage"] == 40.0

def test_empty_progress_handling():
    res = ProgressTracker.calculate_progress([])
    assert res["total_tasks"] == 0
    assert res["completion_percentage"] == 0.0