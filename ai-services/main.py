import logging
import os
import shutil
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from pipeline.diarization import run_speaker_diarization
from pipeline.exceptions import PipelineRuntimeError, PipelineValidationError

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(exist_ok=True)


@app.post("/upload-lecture")
def upload_lecture(file: UploadFile = File(...)):
    if not file.filename or not (
        file.filename.lower().endswith(".webm")
        or file.filename.lower().endswith(".mp3")
    ):
        raise HTTPException(
            status_code=400,
            detail="Only .webm or .mp3 files are allowed.",
        )

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / unique_name

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        logger.exception("Failed writing upload to disk")
        raise HTTPException(
            status_code=500,
            detail="Failed to store uploaded file.",
        ) from exc

    try:
        segments = run_speaker_diarization(
            audio_path=file_path,
            huggingface_token=os.getenv("HUGGINGFACE_TOKEN"),
        )
    except PipelineValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PipelineRuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error")
        raise HTTPException(
            status_code=500,
            detail="Unexpected server error.",
        ) from exc

    response_payload = {
        "message": "File uploaded and diarization completed.",
        "segments": [
            {
                "speaker": seg.speaker,
                "start": seg.start,
                "end": seg.end,
                "duration": seg.duration,
            }
            for seg in segments
        ],
    }

    return JSONResponse(response_payload)