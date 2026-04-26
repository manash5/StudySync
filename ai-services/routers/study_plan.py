from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


class StudyNote(BaseModel):
    id: str
    subjectId: str
    subject: str
    title: str
    mainTopic: str
    createdAt: datetime
    reviewed: bool = False
    lastReviewedAt: datetime | None = None
    reviewCount: int = 0
    retentionRate: float | None = None


class StudyRoutine(BaseModel):
    id: str
    subject: str
    day: str
    startTime: str
    endTime: str
    type: Literal["class", "study"] = "class"
    color: str = "#10b981"
    status: Literal["active", "cancelled", "paused"] = "active"


class StudyPlanRequest(BaseModel):
    notes: list[StudyNote] = Field(default_factory=list)
    routines: list[StudyRoutine] = Field(default_factory=list)
    study_window_start: str = "10:00"
    study_window_end: str = "21:00"
    minimum_retention_threshold: float = 50.0


class RetentionItem(BaseModel):
    noteId: str
    subject: str
    title: str
    retentionRate: float
    nextReviewDays: int


class StudySession(BaseModel):
    noteId: str | None = None
    subject: str
    topic: str
    day: str
    start_time: str
    end_time: str
    priority: Literal["High", "Medium", "Low"]
    color: str = "#f59e0b"
    retention_rate: float
    reason: str | None = None


class StudyPlanResponse(BaseModel):
    retention_by_note: list[RetentionItem]
    low_retention_notes: list[RetentionItem]
    sessions: list[StudySession]


def parse_time_to_minutes(value: str) -> int:
    cleaned = value.strip().upper()
    if "AM" in cleaned or "PM" in cleaned:
        time_part, period = cleaned.split()
        hour_text, minute_text = time_part.split(":")
        hour = int(hour_text)
        minute = int(minute_text)
        if period == "PM" and hour != 12:
            hour += 12
        if period == "AM" and hour == 12:
            hour = 0
        return hour * 60 + minute

    hour_text, minute_text = cleaned.split(":")
    return int(hour_text) * 60 + int(minute_text)


def minutes_to_time(value: int) -> str:
    value = max(0, value)
    hour = value // 60
    minute = value % 60
    return f"{hour:02d}:{minute:02d}"


def retention_score(note: StudyNote) -> float:
    reference = note.lastReviewedAt or note.createdAt
    age_days = max((datetime.utcnow() - reference).total_seconds() / 86400, 0)
    decay = pow(2.718281828, -age_days / 14)
    review_boost = min(note.reviewCount * 0.08, 0.24)
    reviewed_boost = 0.08 if note.reviewed else 0.0
    score = 26 + (decay * 56) + (review_boost * 100) + (reviewed_boost * 100)
    return max(5.0, min(100.0, round(score, 2)))


def next_review_days(score: float) -> int:
    if score < 40:
        return 1
    if score < 60:
        return 3
    if score < 75:
        return 7
    if score < 90:
        return 14
    return 30


def build_free_windows(routines: list[StudyRoutine], day: str, window_start: int, window_end: int) -> list[tuple[int, int]]:
    blocked: list[tuple[int, int]] = []
    for routine in routines:
        if routine.day != day or routine.status == "cancelled":
            continue
        if routine.type not in {"class", "study"}:
            continue
        blocked.append((parse_time_to_minutes(routine.startTime), parse_time_to_minutes(routine.endTime)))

    blocked.sort()
    windows: list[tuple[int, int]] = []
    cursor = window_start

    for start, end in blocked:
        if end <= window_start or start >= window_end:
            continue
        start = max(start, window_start)
        end = min(end, window_end)
        if cursor < start:
            windows.append((cursor, start))
        cursor = max(cursor, end)

    if cursor < window_end:
        windows.append((cursor, window_end))

    return [(start, end) for start, end in windows if end - start >= 30]


def generate_sessions(notes: list[StudyNote], routines: list[StudyRoutine], window_start: str, window_end: str, threshold: float) -> StudyPlanResponse:
    retention_rows: list[RetentionItem] = []
    for note in notes:
        score = note.retentionRate if note.retentionRate is not None else retention_score(note)
        retention_rows.append(
            RetentionItem(
                noteId=note.id,
                subject=note.subject,
                title=note.title,
                retentionRate=score,
                nextReviewDays=next_review_days(score),
            )
        )

    retention_rows.sort(key=lambda item: (item.retentionRate, item.subject.lower(), item.title.lower()))
    low_retention_notes = [item for item in retention_rows if item.retentionRate < threshold]

    note_lookup = {note.id: note for note in notes}
    session_pool = retention_rows[:]
    if low_retention_notes:
        priority_ids = {item.noteId for item in low_retention_notes}
        session_pool.sort(key=lambda item: (item.noteId not in priority_ids, item.retentionRate, item.subject.lower()))

    window_start_minutes = parse_time_to_minutes(window_start)
    window_end_minutes = parse_time_to_minutes(window_end)
    sessions: list[StudySession] = []

    day_rotation = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for day in day_rotation:
        free_windows = build_free_windows(routines, day, window_start_minutes, window_end_minutes)
        if not free_windows:
            continue

        for window_start_minute, window_end_minute in free_windows:
            remaining = window_end_minute - window_start_minute
            cursor = window_start_minute

            while remaining >= 30 and session_pool:
                best = session_pool.pop(0)
                note = note_lookup.get(best.noteId)
                if note is None:
                    continue

                duration = 120 if best.retentionRate < threshold else 60 if best.retentionRate >= 75 else 90
                duration = min(duration, remaining)
                if duration < 30:
                    break

                sessions.append(
                    StudySession(
                        noteId=note.id,
                        subject=note.subject,
                        topic=note.mainTopic or note.title,
                        day=day,
                        start_time=minutes_to_time(cursor),
                        end_time=minutes_to_time(cursor + duration),
                        priority="High" if best.retentionRate < threshold else "Medium" if best.retentionRate < 75 else "Low",
                        color="#f59e0b",
                        retention_rate=best.retentionRate,
                        reason="Retention is below 50%" if best.retentionRate < threshold else "Ebbinghaus spaced review",
                    )
                )

                cursor += duration
                remaining -= duration

                if remaining < 30:
                    break

    return StudyPlanResponse(
        retention_by_note=retention_rows,
        low_retention_notes=low_retention_notes,
        sessions=sessions,
    )


@router.post("/generate", response_model=StudyPlanResponse)
async def generate_study_plan(payload: StudyPlanRequest):
    return generate_sessions(
        payload.notes,
        payload.routines,
        payload.study_window_start,
        payload.study_window_end,
        payload.minimum_retention_threshold,
    )