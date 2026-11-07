from enum import Enum
from typing import Dict, Any, Optional

class RoadmapStatus(str, Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"

class RoadmapService:
    def __init__(self):
        self._roadmaps: Dict[str, Dict[str, Any]] = {}

    def save_roadmap(self, roadmap_id: str, student_id: str, title: str, tasks: list, version: int = 1) -> Dict[str, Any]:
        roadmap = {
            "roadmap_id": roadmap_id,
            "student_id": student_id,
            "title": title,
            "tasks": tasks,
            "status": RoadmapStatus.DRAFT,
            "version": version,
            "parent_roadmap_id": None
        }
        self._roadmaps[roadmap_id] = roadmap
        return roadmap

    def approve_roadmap(self, roadmap_id: str) -> Dict[str, Any]:
        roadmap = self._roadmaps.get(roadmap_id)
        if not roadmap:
            raise ValueError(f"Roadmap {roadmap_id} not found.")

        for r in self._roadmaps.values():
            if r["student_id"] == roadmap["student_id"] and r["status"] == RoadmapStatus.ACTIVE:
                r["status"] = RoadmapStatus.SUPERSEDED

        roadmap["status"] = RoadmapStatus.ACTIVE
        return {
            "status": roadmap["status"],
            "message": "Roadmap approved and activated successfully.",
            "roadmap_id": roadmap_id
        }

    def reject_roadmap(self, roadmap_id: str) -> Dict[str, Any]:
        roadmap = self._roadmaps.get(roadmap_id)
        if not roadmap:
            raise ValueError(f"Roadmap {roadmap_id} not found.")

        roadmap["status"] = RoadmapStatus.REJECTED
        return {
            "status": roadmap["status"],
            "message": "Roadmap rejected successfully.",
            "roadmap_id": roadmap_id
        }

    def get_roadmap_by_id(self, roadmap_id: str) -> Optional[Dict[str, Any]]:
        return self._roadmaps.get(roadmap_id)

    def get_active_roadmap(self, student_id: str) -> Optional[Dict[str, Any]]:
        for r in self._roadmaps.values():
            if r["student_id"] == student_id and r["status"] == RoadmapStatus.ACTIVE:
                return r
        return None