from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DiarizationSegment:
    start: float
    end: float
    speaker: str

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass(frozen=True)
class LecturerExtractionResult:
    lecturer_speaker_id: str
    lecturer_duration_seconds: float
    output_path: Path
    nlp_result: "LectureNotesResult | None" = None


@dataclass(frozen=True)
class TfidfConcept:
    concept: str
    score: float


@dataclass(frozen=True)
class LectureNotesResult:
    topic: str
    key_concepts: list[str]
    important_points: list[str]
    prerequisites: list[str]
    detailed_explanation: str
    transcript_text: str
    clean_transcript_text: str
    tfidf_concepts: list[TfidfConcept]
    output_path: Path
