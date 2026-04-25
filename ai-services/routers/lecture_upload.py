# routers/lecture_upload.py
import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def get_dirs():
    upload_dir = Path("uploads")
    output_dir = Path("outputs")
    return upload_dir, output_dir


@router.post("/upload-lecture")
def upload_lecture(file: UploadFile = File(...)):
    from main import pipeline  # import pipeline that was initialized at startup

    upload_dir, _ = get_dirs()

    if pipeline is None:
        raise HTTPException(status_code=500, detail="Pipeline is not initialized.")

    if not file.filename or not (
        file.filename.lower().endswith(".webm")
        or file.filename.lower().endswith(".mp3")
    ):
        raise HTTPException(status_code=400, detail="Only .webm or .mp3 files are allowed.")

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = upload_dir / unique_name

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        logger.exception("Failed writing upload to disk")
        raise HTTPException(status_code=500, detail="Failed to store uploaded file.") from exc

    try:
        from pipeline.exceptions import PipelineRuntimeError, PipelineValidationError
        result = pipeline.run(file_path)
    except PipelineValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PipelineRuntimeError as exc:
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