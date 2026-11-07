from typing import Dict, Any, List

class ProgressTracker:
    @staticmethod
    def calculate_progress(tasks: List[Dict[str, Any]], milestones: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not tasks:
            return {
                "total_tasks": 0,
                "completed_tasks": 0,
                "pending_tasks": 0,
                "completion_percentage": 0.0,
                "summary": "No tasks available in roadmap."
            }

        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.get("completed") is True or t.get("status") == "COMPLETED")
        pending_tasks = total_tasks - completed_tasks
        completion_percentage = round((completed_tasks / total_tasks) * 100, 2)

        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completion_percentage": completion_percentage,
            "summary": f"{completed_tasks}/{total_tasks} tasks completed ({completion_percentage}%)."
        }