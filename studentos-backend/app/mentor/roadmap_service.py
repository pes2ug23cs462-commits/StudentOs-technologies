from enum import Enum
from typing import List, Dict, Optional

class RoadmapStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"

class RoadmapService:
    def __init__(self):
        self.roadmaps: Dict[str, dict] = {}

    def save_roadmap(self, roadmap_id: str, student_id: str, title: str, tasks: List[dict]) -> dict:
        roadmap = {
            "roadmap_id": roadmap_id,
            "student_id": student_id,
            "title": title,
            "tasks": tasks,
            "status": RoadmapStatus.DRAFT,
            "version": 1
        }
        self.roadmaps[roadmap_id] = roadmap
        return roadmap

    def get_roadmap_by_id(self, roadmap_id: str) -> Optional[dict]:
        return self.roadmaps.get(roadmap_id)

    def approve_roadmap(self, roadmap_id: str) -> Optional[dict]:
        roadmap = self.roadmaps.get(roadmap_id)
        if not roadmap:
            return None

        student_id = roadmap["student_id"]
        for rm in self.roadmaps.values():
            if rm["student_id"] == student_id and rm["status"] == RoadmapStatus.ACTIVE:
                rm["status"] = RoadmapStatus.SUPERSEDED

        roadmap["status"] = RoadmapStatus.ACTIVE
        return roadmap

    def reject_roadmap(self, roadmap_id: str) -> Optional[dict]:
        roadmap = self.roadmaps.get(roadmap_id)
        if roadmap:
            roadmap["status"] = RoadmapStatus.REJECTED
        return roadmap

    def get_active_roadmap(self, student_id: str) -> Optional[dict]:
        for rm in self.roadmaps.values():
            if rm["student_id"] == student_id and rm["status"] == RoadmapStatus.ACTIVE:
                return rm
        return None