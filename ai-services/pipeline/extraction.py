from pathlib import Path
from typing import Iterable, List, Tuple

import numpy as np
import soundfile as sf

from .exceptions import PipelineRuntimeError, PipelineValidationError
from .types import DiarizationSegment


def _timestamp_to_index(timestamp: float, sample_rate: int, max_length: int) -> int:
    raw_index = int(round(timestamp * sample_rate))
    return max(0, min(raw_index, max_length))


def build_sample_slices(
    segments: Iterable[DiarizationSegment],
    lecturer_speaker_id: str,
    sample_rate: int,
    total_samples: int,
) -> List[Tuple[int, int]]:
    lecturer_segments = [s for s in segments if s.speaker == lecturer_speaker_id]
    if not lecturer_segments:
        raise PipelineValidationError(
            f"No diarization segments found for lecturer speaker '{lecturer_speaker_id}'."
        )

    lecturer_segments.sort(key=lambda s: (s.start, s.end))

    slices: List[Tuple[int, int]] = []
    for seg in lecturer_segments:
        start_idx = _timestamp_to_index(seg.start, sample_rate, total_samples)
        end_idx = _timestamp_to_index(seg.end, sample_rate, total_samples)
        if end_idx > start_idx:
            slices.append((start_idx, end_idx))

    if not slices:
        raise PipelineValidationError(
            "Lecturer segment timestamps produced no valid sample spans."
        )

    return slices


def extract_lecturer_audio(
    normalized_audio: np.ndarray,
    sample_rate: int,
    segments: Iterable[DiarizationSegment],
    lecturer_speaker_id: str,
    output_path: Path,
) -> Path:
    slices = build_sample_slices(
        segments=segments,
        lecturer_speaker_id=lecturer_speaker_id,
        sample_rate=sample_rate,
        total_samples=len(normalized_audio),
    )

    stitched_parts = [normalized_audio[start:end] for start, end in slices]
    if not stitched_parts:
        raise PipelineValidationError("No lecturer samples available to stitch.")

    stitched_audio = np.concatenate(stitched_parts)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        sf.write(str(output_path), stitched_audio, sample_rate)
    except Exception as exc:
        raise PipelineRuntimeError(f"Failed to write lecturer audio to {output_path}") from exc

    return output_path
