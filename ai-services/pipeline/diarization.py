import importlib
import logging
from pathlib import Path
from threading import Lock
from typing import List

from .exceptions import PipelineRuntimeError
from .types import DiarizationSegment


_DIARIZATION_MODEL = "pyannote/speaker-diarization-3.1"
_LOGGER = logging.getLogger(__name__)
_PIPELINE_CACHE: dict[tuple[str, str], object] = {}
_PIPELINE_CACHE_LOCK = Lock()


def _resolve_device(device_preference: str) -> str:
    preference = (device_preference or "auto").strip().lower()
    if preference not in {"auto", "cpu", "cuda"}:
        raise PipelineRuntimeError(
            "Invalid diarization device. Use one of: auto, cpu, cuda."
        )

    if preference == "cpu":
        return "cpu"

    try:
        torch = importlib.import_module("torch")
    except Exception as exc:
        if preference == "cuda":
            raise PipelineRuntimeError(
                "DIARIZATION_DEVICE is set to cuda, but torch is unavailable."
            ) from exc
        return "cpu"

    has_cuda = bool(getattr(torch.cuda, "is_available", lambda: False)())
    if preference == "cuda":
        if not has_cuda:
            raise PipelineRuntimeError(
                "DIARIZATION_DEVICE is set to cuda, but no CUDA GPU is available."
            )
        return "cuda"

    return "cuda" if has_cuda else "cpu"


def _create_diarization_pipeline(
    huggingface_token: str,
    device_preference: str,
) -> object:
    try:
        pyannote_audio = importlib.import_module("pyannote.audio")
        pipeline_class = getattr(pyannote_audio, "Pipeline")
    except Exception as exc:
        raise PipelineRuntimeError(
            "pyannote.audio is not available. Install dependencies from requirements.txt."
        ) from exc

    try:
        pipeline = pipeline_class.from_pretrained(
            _DIARIZATION_MODEL,
            use_auth_token=huggingface_token,
        )
    except Exception as exc:
        message = str(exc).lower()
        if "gated" in message or "403" in message or "restricted" in message:
            raise PipelineRuntimeError(
                "Unable to access required pyannote gated models. Accept access to "
                "https://huggingface.co/pyannote/speaker-diarization-3.1 and "
                "https://huggingface.co/pyannote/speaker-diarization-community-1, "
                "then retry with a valid HUGGINGFACE_TOKEN."
            ) from exc
        if "list_audio_backends" in message or "torchaudio" in message:
            raise PipelineRuntimeError(
                "Incompatible torchaudio runtime for pyannote diarization. "
                "Use a compatible torch/torchaudio pair in a clean virtual environment."
            ) from exc
        if "torchcodec" in message or "ffmpeg" in message:
            raise PipelineRuntimeError(
                "TorchCodec/FFmpeg runtime is not configured for pyannote audio decoding. "
                "Install a compatible FFmpeg build and torchcodec dependencies."
            ) from exc
        raise PipelineRuntimeError(
            f"Failed to initialize pyannote diarization pipeline. REAL ERROR: {type(exc).__name__}: {exc}"
        ) from exc

    resolved_device = _resolve_device(device_preference)
    if resolved_device == "cuda":
        try:
            torch = importlib.import_module("torch")
            pipeline = pipeline.to(torch.device("cuda"))
        except Exception as exc:
            raise PipelineRuntimeError(
                "Failed to move diarization pipeline to CUDA device."
            ) from exc

    _LOGGER.info("Diarization pipeline initialized on device=%s", resolved_device)
    return pipeline


def get_diarization_pipeline(
    huggingface_token: str,
    device_preference: str = "auto",
) -> object:
    cache_key = (huggingface_token, (device_preference or "auto").strip().lower())

    cached = _PIPELINE_CACHE.get(cache_key)
    if cached is not None:
        return cached

    with _PIPELINE_CACHE_LOCK:
        cached = _PIPELINE_CACHE.get(cache_key)
        if cached is not None:
            return cached

        pipeline = _create_diarization_pipeline(
            huggingface_token=huggingface_token,
            device_preference=device_preference,
        )
        _PIPELINE_CACHE[cache_key] = pipeline
        return pipeline


def warmup_diarization_pipeline(
    huggingface_token: str,
    device_preference: str = "auto",
) -> None:
    get_diarization_pipeline(
        huggingface_token=huggingface_token,
        device_preference=device_preference,
    )


def run_speaker_diarization(
    audio_path: Path,
    huggingface_token: str,
    device_preference: str = "auto",
) -> List[DiarizationSegment]:
    pipeline = get_diarization_pipeline(
        huggingface_token=huggingface_token,
        device_preference=device_preference,
    )

    try:
        diarization = pipeline(str(audio_path))
    except Exception as exc:
        raise PipelineRuntimeError("Speaker diarization inference failed.") from exc

    segments: List[DiarizationSegment] = []
    for segment, _, speaker in diarization.itertracks(yield_label=True):
        start = float(segment.start)
        end = float(segment.end)
        label = str(speaker)

        if end <= start:
            continue

        segments.append(DiarizationSegment(start=start, end=end, speaker=label))

    if not segments:
        raise PipelineRuntimeError("No valid speaker segments were produced by diarization.")

    segments.sort(key=lambda item: (item.start, item.end, item.speaker))
    return segments
