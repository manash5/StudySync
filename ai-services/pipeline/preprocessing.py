from pathlib import Path
import importlib
from typing import Tuple

import numpy as np
import soundfile as sf

from .exceptions import PipelineRuntimeError, PipelineValidationError


_ALLOWED_EXTENSIONS = {".mp3", ".webm", ".wav", ".m4a"}


def preprocess_audio_file(
    input_path: Path,
    output_path: Path,
    target_sample_rate: int,
) -> Tuple[np.ndarray, int]:
    if not input_path.exists():
        raise PipelineValidationError(f"Audio file not found: {input_path}")

    if input_path.suffix.lower() not in _ALLOWED_EXTENSIONS:
        raise PipelineValidationError(
            f"Unsupported audio format '{input_path.suffix}'. Allowed: {sorted(_ALLOWED_EXTENSIONS)}"
        )

    try:
        librosa = importlib.import_module("librosa")
    except Exception as exc:
        raise PipelineRuntimeError(
            "librosa is not available. Install dependencies from requirements.txt."
        ) from exc

    try:
        # Force deterministic mono PCM at the target sample rate for downstream timestamp math.
        audio, sample_rate = librosa.load(
            str(input_path),
            sr=target_sample_rate,
            mono=True,
        )
    except Exception as exc:
        raise PipelineRuntimeError(f"Failed to load and resample audio: {input_path}") from exc

    if audio.size == 0:
        raise PipelineValidationError("Uploaded audio is empty after decoding.")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        sf.write(str(output_path), audio, sample_rate)
    except Exception as exc:
        raise PipelineRuntimeError(
            f"Failed to write normalized audio file: {output_path}"
        ) from exc

    return audio.astype(np.float32, copy=False), sample_rate
