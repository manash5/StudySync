from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

# Single authoritative day order — Monday-first week
DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

MATH_E = 2.718281828


# ── Models ────────────────────────────────────────────────────────────────────


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
    id: str = ""   # optional — frontend may send _id mapped or omit entirely
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


# ── Time helpers ──────────────────────────────────────────────────────────────


def parse_time_to_minutes(value: str) -> int:
    """Convert a time string ('HH:MM', '9:00 AM', '9:00 PM') to minutes since midnight."""
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
    hour = (value // 60) % 24
    minute = value % 60
    return f"{hour:02d}:{minute:02d}"


# ── Ebbinghaus helpers ────────────────────────────────────────────────────────


def retention_score(note: StudyNote) -> float:
    """
    Estimate retention using the Ebbinghaus forgetting curve.

    Base formula: R = 26 + 56 * e^(-age_days / 14)
      - 26   -> long-term floor (residual memory after many days)
      - 56   -> maximum decay contribution on day 0
      - 14   -> half-life in days (review boosts extend this)
      - review_boost: each review adds ~8 pp, capped at +24 pp
      - reviewed flag: one-time +8 pp for notes explicitly marked reviewed
    Result is clamped to [5, 100].
    """
    reference = note.lastReviewedAt or note.createdAt
    age_days = max((datetime.now(timezone.utc) - reference).total_seconds() / 86400, 0)
    decay = pow(MATH_E, -age_days / 14)
    review_boost = min(note.reviewCount * 0.08, 0.24)
    reviewed_boost = 0.08 if note.reviewed else 0.0
    score = 26 + (decay * 56) + (review_boost * 100) + (reviewed_boost * 100)
    return max(5.0, min(100.0, round(score, 2)))


def next_review_days(score: float) -> int:
    """
    Spaced-repetition interval derived from current retention score.
      < 40  -> review tomorrow          (critical)
      < 60  -> review in 3 days         (low)
      < 75  -> review in 7 days         (moderate)
      < 90  -> review in 14 days        (good)
      >= 90 -> review in 30 days        (strong)
    """
    if score < 40:
        return 1
    if score < 60:
        return 3
    if score < 75:
        return 7
    if score < 90:
        return 14
    return 30


def _priority_and_color(
    retention: float, threshold: float
) -> tuple[Literal["High", "Medium", "Low"], str]:
    if retention < threshold:
        return "High", "#ef4444"    # red   – needs urgent review
    if retention < 75:
        return "Medium", "#f59e0b"  # amber – approaching forgetting
    return "Low", "#10b981"         # green – well retained


def _session_reason(retention: float, threshold: float, next_days: int) -> str:
    if retention < threshold:
        return f"Retention critically low ({retention:.0f}%) — review today"
    return f"Ebbinghaus spaced review (due every {next_days}d, retention {retention:.0f}%)"


# ── Scheduling helpers ────────────────────────────────────────────────────────


# ── Comfortable study window constants ───────────────────────────────────────
# Sessions are only placed inside this band regardless of the user's wider
# study_window_start / study_window_end preference.
#   COMFORTABLE_START = 14:00  — after lunch; student has had time to decompress
#   COMFORTABLE_END   = 20:00  — late enough to be relaxed, early enough to rest
# A POST_CLASS_BUFFER of 30 min is added after every class/study block so a
# study card never lands immediately after a lecture.
COMFORTABLE_START_HOUR = 14   # 2 PM
COMFORTABLE_END_HOUR   = 20   # 8 PM
POST_CLASS_BUFFER_MIN  = 30   # breathing room after a class ends


def build_free_windows(
    routines: list[StudyRoutine],
    day: str,
    win_start: int,
    win_end: int,
) -> list[tuple[int, int]]:
    """
    Return free (start, end) minute-pairs that are:
      1. Within [win_start, win_end] (the user's study window)
      2. Within the comfortable band [14:00, 20:00]
      3. At least 30 min after any class/study block ends (post-class buffer)
      4. At least 30 minutes long
      5. Sorted so the sweetest hours (16:00–19:00) are tried first
    """
    comfortable_start = max(win_start, COMFORTABLE_START_HOUR * 60)
    comfortable_end   = min(win_end,   COMFORTABLE_END_HOUR   * 60)

    if comfortable_end <= comfortable_start:
        # Fallback: user's window is entirely outside the comfortable band;
        # use the full window without the hour restriction so at least
        # something gets scheduled.
        comfortable_start = win_start
        comfortable_end   = win_end

    # Collect blocked intervals, extended by the post-class buffer.
    # We block ALL non-cancelled routines — any scheduled commitment (class,
    # study, paused) still occupies the student's mental bandwidth.
    blocked: list[tuple[int, int]] = []
    for routine in routines:
        if routine.day != day or routine.status == "cancelled":
            continue
        block_start = parse_time_to_minutes(routine.startTime)
        block_end   = parse_time_to_minutes(routine.endTime)
        # Extend the end by POST_CLASS_BUFFER_MIN so study sessions are never
        # placed immediately after a lecture — decompression time matters.
        blocked.append((block_start, block_end + POST_CLASS_BUFFER_MIN))

    blocked.sort()

    windows: list[tuple[int, int]] = []
    cursor = comfortable_start

    for start, end in blocked:
        if end <= comfortable_start or start >= comfortable_end:
            continue
        start = max(start, comfortable_start)
        end   = min(end,   comfortable_end)
        if cursor < start:
            windows.append((cursor, start))
        cursor = max(cursor, end)

    if cursor < comfortable_end:
        windows.append((cursor, comfortable_end))

    # Filter out slots shorter than 30 minutes
    windows = [(s, e) for s, e in windows if e - s >= 30]

    # Sort windows so the "sweet spot" hours are tried first.
    # 16:00–19:00 (960–1140 min) is the prime after-class study zone:
    # alert enough to learn, relaxed enough to enjoy it.
    SWEET_START = 16 * 60   # 4 PM
    SWEET_END   = 19 * 60   # 7 PM

    def _window_score(w: tuple[int, int]) -> int:
        s, e = w
        overlap = max(0, min(e, SWEET_END) - max(s, SWEET_START))
        # Higher overlap with sweet spot = lower sort key = tried first
        return -overlap

    windows.sort(key=_window_score)
    return windows


def _session_duration(retention: float, threshold: float, remaining: int) -> int:
    """
    Allocate session duration based on how urgently the note needs review.
      High priority (< threshold) -> 90 min
      Medium (< 75)               -> 60 min
      Low (>= 75)                 -> 45 min
    Capped by available remaining time. Minimum schedulable block is 30 min.
    """
    if retention < threshold:
        base = 90
    elif retention < 75:
        base = 60
    else:
        base = 45
    return min(base, remaining)


# ── Core scheduler ────────────────────────────────────────────────────────────


def _build_day_pools(
    retention_rows: list[RetentionItem],
    threshold: float,
) -> dict[str, list[RetentionItem]]:
    """
    Assign each note to the days it should be reviewed during the coming week,
    respecting its spaced-repetition interval AND distributing load evenly.

    Interval rules
    --------------
    interval = 1  -> every day (critical retention)
    interval = 3  -> days 0, 3, 6  (Mon, Thu, Sun)
    interval = 7  -> exactly one day this week
    interval > 7  -> exactly one day this week, round-robined across all 7 days

    MAX_NOTES_PER_DAY = 2 ensures no single day is overloaded.
    Overflow items (highest retention = least urgent) are bumped to the
    lightest other day.
    """
    MAX_NOTES_PER_DAY = 2  # max 2 study sessions per day — keeps the schedule healthy

    day_pools: dict[str, list[RetentionItem]] = defaultdict(list)
    day_load: dict[str, int] = {day: 0 for day in DAY_ORDER}

    # ── Pass 1: notes with interval <= 7 follow a fixed cadence ──────────────
    cadence_items = [it for it in retention_rows if it.nextReviewDays <= 7]
    for item in cadence_items:
        interval = item.nextReviewDays
        for day_index, day_name in enumerate(DAY_ORDER):
            if day_index % interval == 0:
                day_pools[day_name].append(item)
                day_load[day_name] += 1

    # ── Pass 2: notes with interval > 7 get distributed round-robin ──────────
    # Sort by retention ascending so most-at-risk notes get first pick of days.
    long_interval_items = sorted(
        [it for it in retention_rows if it.nextReviewDays > 7],
        key=lambda it: it.retentionRate,
    )

    for item in long_interval_items:
        # Pick the day with the current lightest load (ties broken by DAY_ORDER)
        target_day = min(DAY_ORDER, key=lambda d: day_load[d])
        day_pools[target_day].append(item)
        day_load[target_day] += 1

    # ── Pass 3: enforce per-day cap — overflow goes to next lightest day ──────
    for day_name in list(DAY_ORDER):
        while day_load[day_name] > MAX_NOTES_PER_DAY:
            # Pop the lowest-priority (highest retention) item — safest to defer
            overflow_item = max(day_pools[day_name], key=lambda it: it.retentionRate)
            day_pools[day_name].remove(overflow_item)
            day_load[day_name] -= 1

            # Find the lightest OTHER day and move it there
            other_days = [d for d in DAY_ORDER if d != day_name]
            lightest = min(other_days, key=lambda d: day_load[d])
            day_pools[lightest].append(overflow_item)
            day_load[lightest] += 1

    # ── Sort each day: most urgent first ─────────────────────────────────────
    for day_name in day_pools:
        day_pools[day_name].sort(
            key=lambda it: (it.retentionRate, it.subject.lower(), it.title.lower())
        )

    return day_pools


def generate_sessions(
    notes: list[StudyNote],
    routines: list[StudyRoutine],
    study_window_start: str,
    study_window_end: str,
    threshold: float,
) -> StudyPlanResponse:
    # ── 1. Compute retention for every note ──────────────────────────────────
    retention_rows: list[RetentionItem] = []
    for note in notes:
        # Only use a pre-set retentionRate when it is explicitly provided AND
        # positive — a value of 0.0 most likely means "not yet computed".
        if note.retentionRate is not None and note.retentionRate > 0:
            score = note.retentionRate
        else:
            score = retention_score(note)

        retention_rows.append(
            RetentionItem(
                noteId=note.id,
                subject=note.subject,
                title=note.title,
                retentionRate=score,
                nextReviewDays=next_review_days(score),
            )
        )

    retention_rows.sort(
        key=lambda it: (it.retentionRate, it.subject.lower(), it.title.lower())
    )
    low_retention_notes = [it for it in retention_rows if it.retentionRate < threshold]

    # ── 2. Build per-day note pools (with recurrence) ────────────────────────
    day_pools = _build_day_pools(retention_rows, threshold)
    note_lookup = {note.id: note for note in notes}

    # ── 3. Parse study window once ───────────────────────────────────────────
    win_start_min = parse_time_to_minutes(study_window_start)
    win_end_min = parse_time_to_minutes(study_window_end)

    # ── 4. Schedule sessions day by day ──────────────────────────────────────
    #
    # Rules that keep the calendar readable:
    #   MAX_SESSIONS_PER_DAY = 2  -> at most 2 study blocks per day
    #   BREAK_MINUTES = 15        -> mandatory gap between back-to-back sessions
    #
    # Even on a day with lots of free time, only 2 study cards appear.
    # The rest of the notes flow to other days via _build_day_pools.
    MAX_SESSIONS_PER_DAY = 2
    BREAK_MINUTES = 15

    sessions: list[StudySession] = []

    for day in DAY_ORDER:
        pool = list(day_pools.get(day, []))  # fresh copy per day
        if not pool:
            continue

        free_windows = build_free_windows(routines, day, win_start_min, win_end_min)
        if not free_windows:
            continue

        sessions_today = 0

        for fw_start, fw_end in free_windows:
            if sessions_today >= MAX_SESSIONS_PER_DAY:
                break

            remaining = fw_end - fw_start
            cursor = fw_start
            first_in_window = True

            for item in pool[:]:  # snapshot — safe to mutate pool inside loop
                if sessions_today >= MAX_SESSIONS_PER_DAY:
                    break
                if remaining < 30:
                    break

                # Insert a breathing gap between consecutive sessions
                if not first_in_window:
                    cursor += BREAK_MINUTES
                    remaining -= BREAK_MINUTES
                    if remaining < 30:
                        break

                note = note_lookup.get(item.noteId)
                if note is None:
                    continue

                duration = _session_duration(item.retentionRate, threshold, remaining)
                if duration < 30:
                    continue

                priority, color = _priority_and_color(item.retentionRate, threshold)
                reason = _session_reason(item.retentionRate, threshold, item.nextReviewDays)

                sessions.append(
                    StudySession(
                        noteId=note.id,
                        subject=note.subject,
                        topic=note.mainTopic or note.title,
                        day=day,
                        start_time=minutes_to_time(cursor),
                        end_time=minutes_to_time(cursor + duration),
                        priority=priority,
                        color=color,
                        retention_rate=item.retentionRate,
                        reason=reason,
                    )
                )

                cursor += duration
                remaining -= duration
                sessions_today += 1
                first_in_window = False
                pool.remove(item)  # don't double-book within the same day

    return StudyPlanResponse(
        retention_by_note=retention_rows,
        low_retention_notes=low_retention_notes,
        sessions=sessions,
    )


# ── Route ─────────────────────────────────────────────────────────────────────


@router.post("/generate", response_model=StudyPlanResponse)
async def generate_study_plan(payload: StudyPlanRequest) -> StudyPlanResponse:
    return generate_sessions(
        payload.notes,
        payload.routines,
        payload.study_window_start,
        payload.study_window_end,
        payload.minimum_retention_threshold,
    )