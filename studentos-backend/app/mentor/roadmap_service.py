import uuid
from enum import Enum
from typing import Dict, List, Optional, Any

# Import the Groq LLM provider function from Rohit's file
from app.mentor.llm_provider import generate_json_response


class RoadmapStatus(Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"


class RoadmapService:
    def __init__(self):
        self.roadmaps: Dict[str, dict] = {}

    def create_roadmap_draft(self, student_id: str, content: dict) -> dict:
        roadmap_id = str(uuid.uuid4())
        roadmap = {
            "roadmap_id": roadmap_id,
            "student_id": student_id,
            "status": RoadmapStatus.DRAFT.value,
            "content": content,
            "version": 1,
        }
        self.roadmaps[roadmap_id] = roadmap
        return roadmap

    def approve_roadmap(self, roadmap_id: str) -> Optional[dict]:
        roadmap = self.roadmaps.get(roadmap_id)
        if not roadmap or roadmap["status"] != RoadmapStatus.DRAFT.value:
            return None

        student_id = roadmap["student_id"]
        current_active = self.get_active_roadmap(student_id)
        if current_active:
            current_active["status"] = RoadmapStatus.SUPERSEDED.value

        roadmap["status"] = RoadmapStatus.ACTIVE.value
        return roadmap

    def reject_roadmap(self, roadmap_id: str) -> Optional[dict]:
        roadmap = self.roadmaps.get(roadmap_id)
        if not roadmap or roadmap["status"] != RoadmapStatus.DRAFT.value:
            return None

        roadmap["status"] = RoadmapStatus.REJECTED.value
        return roadmap

    def get_active_roadmap(self, student_id: str) -> Optional[dict]:
        for roadmap in self.roadmaps.values():
            if (
                roadmap["student_id"] == student_id
                and roadmap["status"] == RoadmapStatus.ACTIVE.value
            ):
                return roadmap
        return None

    def get_roadmap_by_id(self, roadmap_id: str) -> Optional[dict]:
        return self.roadmaps.get(roadmap_id)

    # =====================================================================
    # RESPONSIBILITY #3: BASIC PROGRESS TRACKING
    # =====================================================================

    def calculate_progress(self, progress_data: Optional[dict]) -> dict:
        """
        Calculates student learning progress based on completed/pending tasks
        and milestones. Safely handles empty, invalid, or missing data.
        """
        if not progress_data or not isinstance(progress_data, dict):
            return {
                "total_tasks": 0,
                "completed_tasks": 0,
                "pending_tasks": 0,
                "completion_percentage": 0.0,
                "total_milestones": 0,
                "completed_milestones": 0,
                "pending_milestones": 0,
                "summary": "No progress data available.",
            }

        tasks = progress_data.get("tasks", [])
        milestones = progress_data.get("milestones", [])

        if not isinstance(tasks, list):
            tasks = []
        if not isinstance(milestones, list):
            milestones = []

        total_tasks = len(tasks)
        completed_tasks = 0
        pending_tasks = 0

        for task in tasks:
            if isinstance(task, dict) and task.get("completed") is True:
                completed_tasks += 1
            else:
                pending_tasks += 1

        completion_percentage = (
            round((completed_tasks / total_tasks) * 100, 2)
            if total_tasks > 0
            else 0.0
        )

        total_milestones = len(milestones)
        completed_milestones = 0
        pending_milestones = 0

        for m in milestones:
            if isinstance(m, dict) and m.get("completed") is True:
                completed_milestones += 1
            else:
                pending_milestones += 1

        summary = (
            f"Progress Summary: {completed_tasks}/{total_tasks} tasks completed "
            f"({completion_percentage}%). {completed_milestones}/{total_milestones} milestones finished."
        )

        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completion_percentage": completion_percentage,
            "total_milestones": total_milestones,
            "completed_milestones": completed_milestones,
            "pending_milestones": pending_milestones,
            "summary": summary,
        }


# =====================================================================
# INTEGRATION CONNECTORS WITH GROQ LLM PROVIDER
# =====================================================================

def generate_and_save_roadmap_draft(
    student_id: str,
    user_goal_prompt: str,
    service: Optional[RoadmapService] = None,
) -> dict[str, Any]:
    """
    Calls Groq LLM provider to generate structured JSON roadmap data
    and saves it directly as a DRAFT in RoadmapService.
    """
    if service is None:
        service = RoadmapService()

    system_prompt = (
        "You are StudentOS AI Mentor. Generate a structured learning roadmap. "
        "Include keys 'title', 'description', and 'milestones'."
    )

    # 1. Generate real JSON output from Groq LLM Provider
    roadmap_json = generate_json_response(
        system_prompt=system_prompt,
        user_message=user_goal_prompt,
    )

    # 2. Pass output into RoadmapService to create DRAFT state
    draft = service.create_roadmap_draft(student_id=student_id, content=roadmap_json)
    return draft