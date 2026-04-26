# main.py
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pipeline.config import load_pipeline_settings_from_env
from pipeline.exceptions import PipelineConfigError
from pipeline.orchestrator import LecturerSpeechPipeline
from routers import lecture_upload, routine_analyzer, study_plan

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path("outputs")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
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
            "Pipeline initialized with sample_rate=%d channels=%d",
            settings.audio_sample_rate,
            settings.audio_channels,
        )
    except PipelineConfigError as exc:
        logger.exception("Pipeline startup configuration error")
        raise RuntimeError(f"Pipeline configuration failed: {exc}") from exc


# ── Routers ───────────────────────────────────────────
app.include_router(lecture_upload.router, prefix="/lecture")
app.include_router(routine_analyzer.router, prefix="/routine")
app.include_router(study_plan.router, prefix="/study-plan")