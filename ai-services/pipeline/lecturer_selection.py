from collections import defaultdict
from typing import Dict, Iterable, Tuple

from .exceptions import PipelineValidationError
from .types import DiarizationSegment


def aggregate_speaker_durations(
    segments: Iterable[DiarizationSegment],
) -> Dict[str, float]:
    totals: Dict[str, float] = defaultdict(float)
    for segment in segments:
        totals[segment.speaker] += segment.duration
    return dict(totals)


def select_lecturer_speaker(
    segments: Iterable[DiarizationSegment],
) -> Tuple[str, float, Dict[str, float]]:
    durations = aggregate_speaker_durations(segments)
    if not durations:
        raise PipelineValidationError("No diarization segments available for lecturer selection.")

    # Deterministic tie-break: longest duration, then lexical speaker id ascending.
    lecturer_speaker, lecturer_duration = min(
        durations.items(),
        key=lambda item: (-item[1], item[0]),
    )

    return lecturer_speaker, lecturer_duration, durations
