import os
from dataclasses import dataclass

from .exceptions import PipelineConfigError


@dataclass(frozen=True)
class PipelineSettings:
    huggingface_token: str
    groq_api_key: str
    groq_base_url: str
    groq_whisper_model: str
    groq_chat_model: str
    tfidf_top_n: int
    audio_sample_rate: int
    audio_channels: int
    diarization_device: str
    diarization_warmup: bool
    transcription_chunk_seconds: int
    transcription_max_workers: int
    transcription_timeout_seconds: int
    notes_timeout_seconds: int


_DEFAULT_SAMPLE_RATE = 16000
_DEFAULT_CHANNELS = 1
_DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_DEFAULT_GROQ_WHISPER_MODEL = "whisper-large-v3"
_DEFAULT_GROQ_CHAT_MODEL = "llama-3.1-8b-instant"
_DEFAULT_TFIDF_TOP_N = 10
_DEFAULT_DIARIZATION_DEVICE = "auto"
_DEFAULT_DIARIZATION_WARMUP = True
_DEFAULT_TRANSCRIPTION_CHUNK_SECONDS = 60
_DEFAULT_TRANSCRIPTION_MAX_WORKERS = 4
_DEFAULT_TRANSCRIPTION_TIMEOUT_SECONDS = 180
_DEFAULT_NOTES_TIMEOUT_SECONDS = 120


def _read_required_env(env_name: str, error_message: str | None = None) -> str:
    value = os.getenv(env_name, "").strip()
    if value:
        return value

    if error_message:
        raise PipelineConfigError(error_message)
    raise PipelineConfigError(f"Missing required environment variable {env_name}.")


def _read_str_env(env_name: str, default: str) -> str:
    value = os.getenv(env_name)
    if value is None:
        return default

    value = value.strip()
    return value if value else default


def _read_int_env(env_name: str, default: int) -> int:
    raw_value = os.getenv(env_name)
    if raw_value is None or raw_value.strip() == "":
        return default

    try:
        value = int(raw_value)
    except ValueError as exc:
        raise PipelineConfigError(
            f"Environment variable {env_name} must be an integer."
        ) from exc

    if value <= 0:
        raise PipelineConfigError(
            f"Environment variable {env_name} must be a positive integer."
        )
    return value


def _read_bool_env(env_name: str, default: bool) -> bool:
    raw_value = os.getenv(env_name)
    if raw_value is None or raw_value.strip() == "":
        return default

    normalized = raw_value.strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False

    raise PipelineConfigError(
        f"Environment variable {env_name} must be a boolean (true/false)."
    )


def load_pipeline_settings_from_env() -> PipelineSettings:
    token = _read_required_env(
        "HUGGINGFACE_TOKEN",
        "Missing required environment variable HUGGINGFACE_TOKEN for speaker diarization.",
    )
    groq_api_key = _read_required_env(
        "GROQ_API_KEY",
        "Missing required environment variable GROQ_API_KEY for transcription and notes generation.",
    )

    groq_base_url = _read_str_env("GROQ_BASE_URL", _DEFAULT_GROQ_BASE_URL).rstrip("/")
    if not groq_base_url.startswith("http"):
        raise PipelineConfigError("GROQ_BASE_URL must be a valid HTTP(S) URL.")

    groq_whisper_model = _read_str_env("GROQ_WHISPER_MODEL", _DEFAULT_GROQ_WHISPER_MODEL)
    groq_chat_model = _read_str_env("GROQ_CHAT_MODEL", _DEFAULT_GROQ_CHAT_MODEL)

    sample_rate = _read_int_env("AUDIO_SAMPLE_RATE", _DEFAULT_SAMPLE_RATE)
    channels = _read_int_env("AUDIO_CHANNELS", _DEFAULT_CHANNELS)
    tfidf_top_n = _read_int_env("TFIDF_TOP_N", _DEFAULT_TFIDF_TOP_N)
    diarization_device = _read_str_env("DIARIZATION_DEVICE", _DEFAULT_DIARIZATION_DEVICE).lower()
    diarization_warmup = _read_bool_env("DIARIZATION_WARMUP", _DEFAULT_DIARIZATION_WARMUP)
    transcription_chunk_seconds = _read_int_env(
        "TRANSCRIPTION_CHUNK_SECONDS", _DEFAULT_TRANSCRIPTION_CHUNK_SECONDS
    )
    transcription_max_workers = _read_int_env(
        "TRANSCRIPTION_MAX_WORKERS", _DEFAULT_TRANSCRIPTION_MAX_WORKERS
    )
    transcription_timeout_seconds = _read_int_env(
        "TRANSCRIPTION_TIMEOUT_SECONDS", _DEFAULT_TRANSCRIPTION_TIMEOUT_SECONDS
    )
    notes_timeout_seconds = _read_int_env(
        "NOTES_TIMEOUT_SECONDS", _DEFAULT_NOTES_TIMEOUT_SECONDS
    )

    if channels != 1:
        raise PipelineConfigError(
            "AUDIO_CHANNELS must be set to 1 for this mono lecturer extraction pipeline."
        )

    if diarization_device not in {"auto", "cpu", "cuda"}:
        raise PipelineConfigError(
            "DIARIZATION_DEVICE must be one of: auto, cpu, cuda."
        )

    return PipelineSettings(
        huggingface_token=token,
        groq_api_key=groq_api_key,
        groq_base_url=groq_base_url,
        groq_whisper_model=groq_whisper_model,
        groq_chat_model=groq_chat_model,
        tfidf_top_n=tfidf_top_n,
        audio_sample_rate=sample_rate,
        audio_channels=channels,
        diarization_device=diarization_device,
        diarization_warmup=diarization_warmup,
        transcription_chunk_seconds=transcription_chunk_seconds,
        transcription_max_workers=transcription_max_workers,
        transcription_timeout_seconds=transcription_timeout_seconds,
        notes_timeout_seconds=notes_timeout_seconds,
    )
