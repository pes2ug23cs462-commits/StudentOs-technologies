
"""Student-controlled study schedule management."""

from typing import Any


def split_task_into_sessions(
    task_minutes: int,
    daily_minutes: int,
) -> list[int]:
    """Split a task into sessions within the daily time limit."""

    if (
        not isinstance(task_minutes, int)
        or isinstance(task_minutes, bool)
        or task_minutes <= 0
    ):
        raise ValueError("Task duration must be a positive integer.")

    if (
        not isinstance(daily_minutes, int)
        or isinstance(daily_minutes, bool)
        or daily_minutes <= 0
    ):
        raise ValueError("Daily study time must be a positive integer.")

    sessions = []
    remaining = task_minutes

    while remaining > 0:
        session = min(remaining, daily_minutes)
        sessions.append(session)
        remaining -= session

    return sessions


def validate_sessions(
    sessions: list[int],
    task_minutes: int,
    daily_minutes: int,
) -> bool:
    """Check that student-edited sessions are valid."""

    if not isinstance(sessions, list) or not sessions:
        return False

    if any(
        not isinstance(minutes, int)
        or isinstance(minutes, bool)
        or minutes <= 0
        or minutes > daily_minutes
        for minutes in sessions
    ):
        return False

    return sum(sessions) == task_minutes
