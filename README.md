# StudySync 🎓
### AI-Powered Semester Study Assistant — *Your Semester, Mathematically Optimized*

StudySync transforms raw lecture recordings into a complete, personalized learning system. Built for university students juggling multiple subjects and dense lecture content.

---

## The Problem

Every semester, same cycle:
- Sit in lecture, try to write notes *and* listen → miss half of it
- End up with incomplete, disorganized notes
- Exam season hits → no idea what to study, in what order, or for how long

Existing tools (Otter, Coconote, Knowt) just transcribe or generate generic summaries. None understand the structure of learning or help students actually prepare for exams.

---

## Core Features

### 🎙️ 1. Intelligent Lecture Processing
Upload or record any lecture audio. StudySync uses **MFCC-based audio feature clustering** to identify and isolate the dominant speaker (the lecturer). Only the lecturer's voice gets transcribed — student questions and background noise filtered automatically.

### 📚 2. Structured Knowledge Extraction
Transcribed lectures are analyzed using **TF-IDF** (Term Frequency–Inverse Document Frequency) to extract the most significant concepts. Each lecture produces a structured study card containing:
- Main topic & prerequisites
- Key concepts ranked by importance
- Highlighted points
- Clean, organized notes

### 📅 3. Spaced Repetition Study Planner
Input exam dates → StudySync applies the **Ebbinghaus Forgetting Curve**:

$$H(t) = e^{-t/S}$$

The engine calculates optimal study and review intervals across all subjects. Higher-complexity topics get more time. Topics near exam dates get mathematically timed review sessions.

**Output:** A personalized daily plan:
> *"Today: study Module 2 Lecture 3 — Gradient Descent (45 mins), review Module 1 Lecture 1 — Linear Algebra (20 mins)."*

### 🔄 4. Adaptive Rescheduling
- Mark topic as *not understood* → rescheduled sooner, prerequisites surfaced first
- Ahead of plan → time redistributed to weaker subjects automatically

---

## The Math Layer

Three applied mathematics foundations power StudySync:

| Layer | Method | Purpose |
|---|---|---|
| Audio | MFCC-based clustering | Isolate lecturer from background voices |
| NLP | TF-IDF vectorization | Quantify concept importance per lecture |
| Memory | Ebbinghaus forgetting curve | Optimize review schedule across semester |

These are not cosmetic additions — they are the core of what makes StudySync work.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | FastAPI |
| Transcription | OpenAI Whisper |
| Speaker Diarization | pyannote-audio |
| Concept Extraction | scikit-learn TF-IDF |
| Study Scheduling | Custom spaced repetition engine |
| AI Layer | LLM API (note structuring, prerequisite extraction, concept maps) |

---

## How It Differs

| Feature | Otter / Coconote / Knowt | StudySync |
|---|---|---|
| Transcription | ✅ | ✅ |
| Generic summaries | ✅ | ✅ |
| Lecturer-only isolation | ❌ | ✅ |
| Prerequisite extraction | ❌ | ✅ |
| Exam-linked study schedule | ❌ | ✅ |
| Adaptive rescheduling | ❌ | ✅ |

---

## Who It's For

University students with:
- Multiple subjects and lecture recordings
- Upcoming exams and limited prep time
- No existing personalized study infrastructure

Built specifically with students at institutions like **Kathmandu University** in mind.

---

## Getting Started

### Prerequisites

> ⚠️ **Version Warning:** `pyannote.audio` and `speechbrain` are strict about versions. Using the wrong Python or PyTorch will break speaker diarization silently or with cryptic errors.

- **Python 3.10** (not 3.11+)
- **CUDA 11.8** compatible GPU recommended (CPU works but is slow for diarization)

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/studysync.git
cd studysync
```

### 2. AI Service setup

```bash
cd ai-service

# Create and activate a Python 3.10 virtual environment
python3.10 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install CUDA-enabled PyTorch FIRST (required before other deps)
pip install torch==2.1.0+cu118 torchaudio==2.1.0+cu118 --index-url https://download.pytorch.org/whl/cu118

# Then install remaining dependencies
pip install -r requirements.txt
```

> ℹ️ PyTorch must be installed separately before `requirements.txt` — otherwise pip may pull in a CPU-only version and pyannote will fail.

### 3. Backend setup

```bash
cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

---

## Contributing

Pull requests welcome. Open an issue first for major changes.

---

