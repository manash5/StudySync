import logging
from pathlib import Path

from .config import PipelineSettings
from .diarization import run_speaker_diarization, warmup_diarization_pipeline
from .extraction import extract_lecturer_audio
from .lecturer_selection import select_lecturer_speaker
from .nlp_pipeline import process_lecture_pipeline
from .preprocessing import preprocess_audio_file
from .types import LecturerExtractionResult


class LecturerSpeechPipeline:
    def __init__(self, settings: PipelineSettings, output_dir: Path) -> None:
        self.settings = settings
        self.output_dir = output_dir
        self.logger = logging.getLogger(__name__)

        if self.settings.diarization_warmup:
            self.logger.info(
                "Stage diarization-warmup: device=%s",
                self.settings.diarization_device,
            )
            warmup_diarization_pipeline(
                huggingface_token=self.settings.huggingface_token,
                device_preference=self.settings.diarization_device,
            )

    def run(self, uploaded_audio_path: Path) -> LecturerExtractionResult:
        self.logger.info("Pipeline start for %s", uploaded_audio_path)

        normalized_path = self.output_dir / "normalized_audio.wav"
        self.logger.info("Stage preprocessing: input=%s output=%s", uploaded_audio_path, normalized_path)
        normalized_audio, sample_rate = preprocess_audio_file(
            input_path=uploaded_audio_path,
            output_path=normalized_path,
            target_sample_rate=self.settings.audio_sample_rate,
        )

        self.logger.info("Stage diarization: audio=%s", normalized_path)
        segments = run_speaker_diarization(
            audio_path=normalized_path,
            huggingface_token=self.settings.huggingface_token,
            device_preference=self.settings.diarization_device,
        )

        self.logger.info("Stage lecturer-selection: segments=%d", len(segments))
        lecturer_speaker_id, lecturer_duration, _ = select_lecturer_speaker(segments)

        lecturer_output_path = self.output_dir / "lecturer_audio.wav"
        self.logger.info(
            "Stage extraction: lecturer=%s duration=%.2fs output=%s",
            lecturer_speaker_id,
            lecturer_duration,
            lecturer_output_path,
        )
        extract_lecturer_audio(
            normalized_audio=normalized_audio,
            sample_rate=sample_rate,
            segments=segments,
            lecturer_speaker_id=lecturer_speaker_id,
            output_path=lecturer_output_path,
        )

        self.logger.info("Stage nlp: lecturer_audio=%s", lecturer_output_path)
        nlp_result = process_lecture_pipeline(
            lecturer_audio_path=lecturer_output_path,
            output_dir=self.output_dir,
            settings=self.settings,
        )

        self.logger.info("Pipeline completed for %s", uploaded_audio_path)
        return LecturerExtractionResult(
            lecturer_speaker_id=lecturer_speaker_id,
            lecturer_duration_seconds=lecturer_duration,
            output_path=lecturer_output_path,
            nlp_result=nlp_result,
        )
