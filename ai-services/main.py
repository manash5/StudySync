import logging
import os
import shutil
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from pipeline.config import load_pipeline_settings_from_env
from pipeline.exceptions import (
    PipelineConfigError,
    PipelineRuntimeError,
    PipelineValidationError,
)
from pipeline.orchestrator import LecturerSpeechPipeline


load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

pipeline: LecturerSpeechPipeline | None = None


@app.on_event("startup")
def startup_checks() -> None:
    global pipeline

    try:
        settings = load_pipeline_settings_from_env()
        pipeline = LecturerSpeechPipeline(settings=settings, output_dir=OUTPUT_DIR)
        logger.info(
            "Lecturer extraction pipeline initialized with sample_rate=%d channels=%d",
            settings.audio_sample_rate,
            settings.audio_channels,
        )
    except PipelineConfigError as exc:
        logger.exception("Pipeline startup configuration error")
        raise RuntimeError(f"Pipeline configuration failed: {exc}") from exc

@app.post("/upload-lecture")
def upload_lecture(file: UploadFile = File(...)):
    if pipeline is None:
        raise HTTPException(status_code=500, detail="Pipeline is not initialized.")

    # Validate file type
    if not file.filename or not (
        file.filename.lower().endswith(".webm")
        or file.filename.lower().endswith(".mp3")
    ):
        raise HTTPException(status_code=400, detail="Only .webm or .mp3 files are allowed.")

    # Save uploaded file
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / unique_name
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        logger.exception("Failed writing upload to disk")
        raise HTTPException(status_code=500, detail="Failed to store uploaded file.") from exc

    try:
        result = pipeline.run(file_path)
    except PipelineValidationError as exc:
        logger.exception("Pipeline validation failure")
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PipelineRuntimeError as exc:
        logger.exception("Pipeline runtime failure")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected pipeline error")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from exc

    response_payload = {
        "message": "File uploaded and lecturer speech extracted successfully.",
        "lecturer_speaker_id": result.lecturer_speaker_id,
        "lecturer_duration_seconds": round(result.lecturer_duration_seconds, 3),
        "output_file": str(result.output_path),
    }

    if result.nlp_result is not None:
        response_payload["structured_notes_file"] = str(result.nlp_result.output_path)
        response_payload["topic"] = result.nlp_result.topic
        response_payload["key_concepts"] = result.nlp_result.key_concepts
        response_payload["important_points"] = result.nlp_result.important_points
        response_payload["prerequisites"] = result.nlp_result.prerequisites
        response_payload["detailed_explanation"] = result.nlp_result.detailed_explanation

    return JSONResponse(response_payload)
