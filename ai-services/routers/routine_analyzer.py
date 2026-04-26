from fastapi import APIRouter, UploadFile, File
import google.generativeai as genai
from PIL import Image
import io
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


@router.post("/analyze-routine")
async def analyze_routine(image: UploadFile = File(...)):
    """
    Upload a timetable/routine image.
    Returns structured JSON with all courses, their days and time slots.
    """

    # Read uploaded image bytes and convert to PIL Image for Gemini
    image_bytes = await image.read()
    pil_image = Image.open(io.BytesIO(image_bytes))

    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = """
    You are analyzing a university timetable/routine image.
    
    Extract ALL classes/courses visible in the image.
    
    For each course, extract:
    - course_code: the course code (e.g. ST6003CEM)
    - course_name: the full course name (e.g. Web API Development)
    - days: list of days this class occurs (e.g. ["Monday", "Wednesday", "Friday"])
    - start_time: start time in 12-hour format (e.g. "9:00 AM")
    - end_time: end time in 12-hour format (e.g. "11:00 AM")
    - location: room/block location if visible (e.g. "Block E - SL-6")
    
    Rules:
    - If the same course appears on multiple days at the same time, group them into one entry with multiple days
    - If the same course appears at DIFFERENT times on different days, create separate entries
    - Return ONLY valid JSON, no explanation, no markdown backticks
    
    Return this exact JSON structure:
    {
      "section": "section name if visible at top of image, else null",
      "total_hours_per_week": number or null,
      "courses": [
        {
          "course_code": "ST6003CEM",
          "course_name": "Web API Development",
          "days": ["Monday", "Wednesday", "Friday"],
          "start_time": "9:00 AM",
          "end_time": "11:00 AM",
          "duration_hours": 2,
          "location": "Block E - SL-6"
        }
      ]
    }
    """

    response = model.generate_content([prompt, pil_image])

    # Strip markdown fences if Gemini adds them
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    parsed = json.loads(raw)

    # Create folder if not exists
    output_dir = "outputs/routine"
    os.makedirs(output_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(output_dir, "routine.json")

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2)

    return parsed