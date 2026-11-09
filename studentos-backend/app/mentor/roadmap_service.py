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