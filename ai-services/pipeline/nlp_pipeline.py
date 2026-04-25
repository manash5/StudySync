import json
import logging
import re
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import soundfile as sf
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

from .config import PipelineSettings
from .exceptions import PipelineRuntimeError, PipelineValidationError
from .types import LectureNotesResult, TfidfConcept


_HTTP_TIMEOUT_SECONDS = 180
_DEFAULT_TRANSCRIPTION_CHUNK_SECONDS = 60
_DEFAULT_TRANSCRIPTION_MAX_WORKERS = 4
_DEFAULT_TRANSCRIPTION_MAX_RETRIES = 2
_TERM_FREQUENCY_WEIGHT = 0.2
_FILLER_PATTERN = re.compile(r"\b(?:uh|um|like)\b|\byou\s+know\b", re.IGNORECASE)
_JSON_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(\{.*\})\s*```", re.DOTALL | re.IGNORECASE)
_TRAILING_COMMA_PATTERN = re.compile(r",\s*([}\]])")
_SECTION_HEADING_PATTERNS = [
    re.compile(r"1\s*\.\s*INTUITIVE\s+INTRODUCTION", re.IGNORECASE),
    re.compile(r"2\s*\.\s*CORE\s+IDEA", re.IGNORECASE),
    re.compile(r"3\s*\.\s*STEP-?BY-?STEP\s+EXAMPLE", re.IGNORECASE),
    re.compile(r"4\s*\.\s*LINE-?BY-?LINE\s+EXPLANATION", re.IGNORECASE),
    re.compile(r"5\s*\.\s*CONNECT\s+TO\s+DEFINITIONS", re.IGNORECASE),
    re.compile(r"6\s*\.\s*COMMON\s+CONFUSIONS", re.IGNORECASE),
    re.compile(r"7\s*\.\s*MINI\s+PRACTICE\s+TASK", re.IGNORECASE),
    re.compile(r"8\s*\.\s*FINAL\s+SUMMARY", re.IGNORECASE),
]
_MIN_TEACHING_CHARS = 450
_MAX_PRIMARY_TRANSCRIPT_CHARS = 2600
_MAX_REWRITE_TRANSCRIPT_CHARS = 1200
_MAX_DRAFT_EXCERPT_CHARS = 700
_MAX_REWRITE_POINTS = 6
_FILENAME_SAFE_PATTERN = re.compile(r"[^a-z0-9]+")
_MAX_TOPIC_SLUG_LENGTH = 60
_LOGGER = logging.getLogger(__name__)


def _ensure_audio_exists(audio_path: Path) -> None:
    if not audio_path.exists() or not audio_path.is_file():
        raise PipelineValidationError(f"Audio file not found: {audio_path}")


def _guess_mime_type(audio_path: Path) -> str:
    suffix = audio_path.suffix.lower()
    if suffix == ".wav":
        return "audio/wav"
    if suffix == ".mp3":
        return "audio/mpeg"
    if suffix == ".webm":
        return "audio/webm"
    return "application/octet-stream"


def _split_for_tfidf(clean_transcript: str) -> list[str]:
    sentence_parts = re.split(r"[.!?]+", clean_transcript)
    documents = [part.strip() for part in sentence_parts if part.strip()]
    return documents if documents else [clean_transcript]


def _parse_json_object(text: str) -> dict[str, Any]:
    candidate = text.strip()
    fenced_match = _JSON_FENCE_PATTERN.search(candidate)
    if fenced_match:
        candidate = fenced_match.group(1).strip()
    
    first_brace = candidate.find("{")
    last_brace = candidate.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = candidate[first_brace : last_brace + 1]
    
    candidate = candidate.strip()
    without_trailing_commas = _TRAILING_COMMA_PATTERN.sub(r"\1", candidate)
    
    try:
        parsed = json.loads(without_trailing_commas)
    except json.JSONDecodeError as exc:
        raise PipelineRuntimeError("LLM response did not contain valid JSON.") from exc
    
    if not isinstance(parsed, dict):
        raise PipelineRuntimeError("LLM response JSON must be an object.")
    return parsed





def _has_teaching_structure(detailed_explanation: str) -> bool:
    if not detailed_explanation.strip():
        return False

    has_all_headings = all(
        pattern.search(detailed_explanation) for pattern in _SECTION_HEADING_PATTERNS
    )
    if not has_all_headings:
        return False

    return len(detailed_explanation.strip()) >= _MIN_TEACHING_CHARS


def _build_domain_profile_hints(top_concepts: list[TfidfConcept]) -> str:
    if not top_concepts:
        return "none"
    return ", ".join(concept.concept for concept in top_concepts[:8])



def _build_structured_teaching_fallback(
    *,
    topic: str,
    key_concepts: list[str],
    important_points: list[str],
    prerequisites: list[str],
) -> str:
    concept_one = key_concepts[0] if key_concepts else topic
    concept_two = key_concepts[1] if len(key_concepts) > 1 else concept_one
    prerequisite_text = ", ".join(prerequisites[:3]) if prerequisites else "No strict prior knowledge"

    point_one = (important_points[0] if important_points and important_points[0].strip() 
                  else f"{concept_one} is central to understanding this lecture.")
    point_two = (important_points[1] if len(important_points) > 1 and important_points[1].strip()
                 else f"{concept_two} helps us apply the idea in real situations.")
    point_three = (important_points[2] if len(important_points) > 2 and important_points[2].strip()
                   else "The lecture builds from simple intuition to practical use.")

    example_block = (
        "Example scenario (domain-grounded flow):\n"
        "- Step 1: Start with one concrete input in this lecture's domain.\n"
        "- Step 2: Apply one clear mechanism or rule from the topic.\n"
        "- Step 3: Observe the output and explain why it changed.\n"
        "- Step 4: Repeat once with a small variation to verify understanding."
    )
    line_by_line_block = (
        "- Step 1 matters because learning begins with concrete domain data, not abstractions.\n"
        "- Step 2 matters because domain rules define how the transformation happens.\n"
        "- Step 3 matters because outputs confirm whether the domain mechanism was applied correctly.\n"
        "- Step 4 matters because variation checks transferable understanding."
    )
    practice_block = (
        "Practice: Pick one small real-world example from this topic.\n"
        "1) Write its input and output.\n"
        "2) Explain the mechanism that connects them.\n"
        "3) Try one variation and describe what changes."
    )

    return (
        "1. INTUITIVE INTRODUCTION\n"
        f"Imagine you are learning a new city bus system without a map. {topic} works the same way: at first everything looks confusing, "
        "but once you understand a few clear rules, moving from one place to another becomes easy. "
        "In this lesson, we build those rules slowly so an absent student can still understand the complete idea.\n\n"
        "2. CORE IDEA (IN SIMPLE WORDS)\n"
        f"The core idea is that {concept_one} gives us a simple way to organize how parts of a system interact. "
        f"Instead of memorizing many disconnected facts, we use {concept_one} and {concept_two} as anchors. "
        "Once those anchors are clear, the rest of the topic becomes logical and easier to remember.\n\n"
        "3. STEP-BY-STEP EXAMPLE (CODE OR CONCEPTUAL)\n"
        f"{example_block}\n\n"
        "4. LINE-BY-LINE EXPLANATION\n"
        f"{line_by_line_block}\n\n"
        "5. CONNECT TO DEFINITIONS\n"
        f"Now connect this to formal language: {concept_one} is a key concept that defines the interaction rule, "
        f"and {concept_two} is another concept used to implement or observe that rule in practice. "
        "The technical terms are names for behaviors you already saw in the example, not new mysteries.\n\n"
        "6. COMMON CONFUSIONS\n"
        "- Confusion: "
        "I must memorize everything first." 
        "Clarification: Start with one small flow; details become easier once the flow is clear.\n"
        "- Confusion: "
        "If one example works, I understand everything." 
        "Clarification: Try at least two variations to confirm real understanding.\n"
        "- Confusion: "
        "Technical words are the concept." 
        "Clarification: Technical words label the concept; they are not the concept itself.\n\n"
        "7. MINI PRACTICE TASK\n"
        f"{practice_block}\n\n"
        "8. FINAL SUMMARY\n"
        f"You learned {topic} from intuition to formal terms: what the core interaction is, how to apply it step by step, "
        f"and how to avoid beginner mistakes. Key lecture anchors were: {point_one} {point_two} {point_three} "
        f"Prerequisite reminder: {prerequisite_text}."
    )


def _compact_text_for_prompt(text: str, max_chars: int) -> str:
    compact = re.sub(r"\s+", " ", text).strip()
    if len(compact) <= max_chars:
        return compact

    available = max(max_chars - 5, 20)
    head = int(available * 0.7)
    tail = available - head
    return f"{compact[:head].rstrip()} ... {compact[-tail:].lstrip()}"


def _extract_rewritten_explanation(content: str) -> str:
    def _coerce_detailed_explanation(value: Any) -> str:
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, list):
            parts = [str(item).strip() for item in value if str(item).strip()]
            return "\n\n".join(parts)
        if isinstance(value, dict):
            parts: list[str] = []
            for key, item in value.items():
                item_text = str(item).strip()
                if item_text:
                    key_text = str(key).strip()
                    parts.append(f"{key_text}: {item_text}" if key_text else item_text)
            return "\n\n".join(parts)
        return ""

    text = content.strip()
    if not text:
        return ""

    if text.startswith("{"):
        try:
            parsed = _parse_json_object(text)
            return _coerce_detailed_explanation(parsed.get("detailed_explanation"))
        except PipelineRuntimeError:
            return text

    return text


def _call_groq_chat_completion(
    *,
    groq_api_key: str,
    groq_base_url: str,
    chat_model: str,
    messages: list[dict[str, str]],
    timeout_seconds: int,
    temperature: float,
    json_response: bool = True,
) -> str:
    endpoint = f"{groq_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": chat_model,
        "temperature": temperature,
        "messages": messages,
    }
    if json_response:
        payload["response_format"] = {"type": "json_object"}

    try:
        response = requests.post(
            endpoint,
            headers=headers,
            json=payload,
            timeout=timeout_seconds,
        )
        if response.status_code == 400 and json_response:
            payload.pop("response_format", None)
            response = requests.post(
                endpoint,
                headers=headers,
                json=payload,
                timeout=timeout_seconds,
            )
    except requests.RequestException as exc:
        raise PipelineRuntimeError("Failed to call LLM chat completion API.") from exc

    if response.status_code >= 400:
        error_body = response.text[:500]
        raise PipelineRuntimeError(
            f"LLM chat completion API returned {response.status_code}: {error_body}"
        )

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise PipelineRuntimeError("Unexpected LLM response structure.") from exc

    return str(content)


def _slugify_for_filename(value: str, fallback: str = "untitled_lecture") -> str:
    normalized = _FILENAME_SAFE_PATTERN.sub("_", value.lower()).strip("_")
    normalized = re.sub(r"_+", "_", normalized)
    if not normalized:
        return fallback
    return normalized[:_MAX_TOPIC_SLUG_LENGTH]


def _build_notes_output_path(output_dir: Path, topic: str) -> Path:
    topic_slug = _slugify_for_filename(topic)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    unique_suffix = uuid.uuid4().hex[:8]
    return output_dir / f"structured_notes_{topic_slug}_{timestamp}_{unique_suffix}.json"


def _call_groq_transcription_api(
    audio_path: Path,
    groq_api_key: str,
    groq_base_url: str,
    whisper_model: str,
    timeout_seconds: int,
) -> str:
    endpoint = f"{groq_base_url.rstrip('/')}/audio/transcriptions"
    headers = {"Authorization": f"Bearer {groq_api_key}"}

    for attempt in range(_DEFAULT_TRANSCRIPTION_MAX_RETRIES + 1):
        try:
            with audio_path.open("rb") as audio_file:
                response = requests.post(
                    endpoint,
                    headers=headers,
                    data={"model": whisper_model},
                    files={
                        "file": (
                            audio_path.name,
                            audio_file,
                            _guess_mime_type(audio_path),
                        )
                    },
                    timeout=timeout_seconds,
                )
        except requests.RequestException as exc:
            if attempt >= _DEFAULT_TRANSCRIPTION_MAX_RETRIES:
                raise PipelineRuntimeError("Failed to call Groq Whisper API.") from exc
            continue
        except OSError as exc:
            raise PipelineRuntimeError(f"Unable to read audio file: {audio_path}") from exc

        if response.status_code in {429, 500, 502, 503, 504} and attempt < _DEFAULT_TRANSCRIPTION_MAX_RETRIES:
            _LOGGER.warning(
                "Retrying transcription chunk=%s after status=%d",
                audio_path.name,
                response.status_code,
            )
            continue

        if response.status_code >= 400:
            error_body = response.text[:500]
            raise PipelineRuntimeError(
                f"Groq Whisper API returned {response.status_code}: {error_body}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise PipelineRuntimeError("Groq Whisper API returned non-JSON response.") from exc

        transcript = str(payload.get("text", "")).strip()
        if transcript:
            return transcript

    raise PipelineValidationError("Groq Whisper transcription returned empty text.")


def _split_audio_to_chunk_files(
    lecturer_audio_path: Path,
    chunk_seconds: int,
    temp_dir: Path,
) -> list[tuple[int, Path]]:
    chunk_files: list[tuple[int, Path]] = []

    try:
        with sf.SoundFile(str(lecturer_audio_path), mode="r") as source:
            frames_per_chunk = max(int(source.samplerate * chunk_seconds), 1)
            chunk_index = 0

            while True:
                audio_chunk = source.read(
                    frames=frames_per_chunk,
                    dtype="float32",
                    always_2d=False,
                )
                if getattr(audio_chunk, "size", 0) == 0:
                    break

                chunk_path = temp_dir / f"chunk_{chunk_index:05d}.wav"
                sf.write(str(chunk_path), audio_chunk, source.samplerate, subtype="PCM_16")
                chunk_files.append((chunk_index, chunk_path))
                chunk_index += 1
    except Exception as exc:
        raise PipelineRuntimeError("Failed to split lecturer audio into transcription chunks.") from exc

    if not chunk_files:
        raise PipelineValidationError("No audio chunks generated for transcription.")

    return chunk_files


def _transcribe_chunks_parallel(
    chunk_files: list[tuple[int, Path]],
    groq_api_key: str,
    groq_base_url: str,
    whisper_model: str,
    max_workers: int,
    timeout_seconds: int,
) -> str:
    workers = max(1, min(max_workers, len(chunk_files)))
    transcripts_by_index: dict[int, str] = {}

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {
            executor.submit(
                _call_groq_transcription_api,
                audio_path=chunk_path,
                groq_api_key=groq_api_key,
                groq_base_url=groq_base_url,
                whisper_model=whisper_model,
                timeout_seconds=timeout_seconds,
            ): index
            for index, chunk_path in chunk_files
        }

        for future in as_completed(future_map):
            index = future_map[future]
            transcripts_by_index[index] = future.result()

    ordered_parts = [transcripts_by_index[idx] for idx, _ in chunk_files]
    full_transcript = " ".join(part.strip() for part in ordered_parts if part.strip()).strip()
    if not full_transcript:
        raise PipelineValidationError("Groq Whisper transcription returned empty text.")

    return full_transcript



def transcribe_lecture_audio(
    lecturer_audio_path: Path,
    groq_api_key: str,
    groq_base_url: str,
    whisper_model: str,
    chunk_seconds: int = _DEFAULT_TRANSCRIPTION_CHUNK_SECONDS,
    max_workers: int = _DEFAULT_TRANSCRIPTION_MAX_WORKERS,
    timeout_seconds: int = _HTTP_TIMEOUT_SECONDS,
) -> str:
    """Step 6: Transcribe lecturer audio using Groq Whisper API."""
    _ensure_audio_exists(lecturer_audio_path)
    if chunk_seconds <= 0:
        raise PipelineValidationError("chunk_seconds must be greater than zero.")
    if max_workers <= 0:
        raise PipelineValidationError("max_workers must be greater than zero.")
    if timeout_seconds <= 0:
        raise PipelineValidationError("timeout_seconds must be greater than zero.")

    try:
        return _call_groq_transcription_api(
            audio_path=lecturer_audio_path,
            groq_api_key=groq_api_key,
            groq_base_url=groq_base_url,
            whisper_model=whisper_model,
            timeout_seconds=timeout_seconds,
        )
    except PipelineRuntimeError as exc:
        if " 413:" not in str(exc) and "413" not in str(exc):
            raise
        _LOGGER.warning(
            "Single-file transcription too large for %s; retrying with chunked transcription.",
            lecturer_audio_path,
        )

    with tempfile.TemporaryDirectory(prefix="transcription_chunks_") as temp_dir_str:
        temp_dir = Path(temp_dir_str)
        chunk_files = _split_audio_to_chunk_files(
            lecturer_audio_path=lecturer_audio_path,
            chunk_seconds=chunk_seconds,
            temp_dir=temp_dir,
        )
        return _transcribe_chunks_parallel(
            chunk_files=chunk_files,
            groq_api_key=groq_api_key,
            groq_base_url=groq_base_url,
            whisper_model=whisper_model,
            max_workers=max_workers,
            timeout_seconds=timeout_seconds,
        )


def clean_transcript_text(raw_transcript: str) -> str:
    """Step 7: Remove filler words and normalize whitespace/punctuation."""
    if not raw_transcript or not raw_transcript.strip():
        raise PipelineValidationError("Raw transcript is empty.")

    cleaned = _FILLER_PATTERN.sub("", raw_transcript)
    cleaned = re.sub(r"\s+([,.;:!?])", r"\1", cleaned)
    cleaned = re.sub(r"([,.;:!?]){2,}", r"\1", cleaned)
    cleaned = re.sub(r"([,.;:!?])(?!\s|$)", r"\1 ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        raise PipelineValidationError("Clean transcript is empty after filler-word removal.")
    return cleaned


def extract_tfidf_concepts(clean_transcript: str, top_n: int = 10) -> list[TfidfConcept]:
    """Step 8: Extract top concepts and scores using TF-IDF."""
    if top_n <= 0:
        raise PipelineValidationError("TF-IDF top_n must be greater than zero.")
    if not clean_transcript or not clean_transcript.strip():
        raise PipelineValidationError("Clean transcript is empty for TF-IDF extraction.")

    documents = _split_for_tfidf(clean_transcript)
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))

    try:
        matrix = vectorizer.fit_transform(documents)
    except ValueError as exc:
        raise PipelineValidationError(
            "Unable to extract TF-IDF concepts from transcript content."
        ) from exc

    scores = matrix.sum(axis=0).A1
    feature_names = vectorizer.get_feature_names_out()
    if len(feature_names) == 0:
        raise PipelineValidationError("TF-IDF did not produce any concepts.")

    # Blend TF-IDF salience with normalized corpus frequency so repeated
    # key ideas rank ahead of one-off terms when scores are tied.
    count_vectorizer = CountVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        vocabulary=feature_names,
    )
    frequency_matrix = count_vectorizer.fit_transform(documents)
    term_counts = frequency_matrix.sum(axis=0).A1
    max_count = float(term_counts.max()) if term_counts.size else 1.0
    normalized_counts = term_counts / max_count if max_count > 0 else term_counts
    ranking_scores = scores + (_TERM_FREQUENCY_WEIGHT * normalized_counts)

    ranked_indices = sorted(
        range(len(feature_names)),
        key=lambda idx: (-ranking_scores[idx], str(feature_names[idx])),
    )[:top_n]
    concepts: list[TfidfConcept] = []
    for index in ranked_indices:
        concepts.append(
            TfidfConcept(
                concept=str(feature_names[index]),
                score=float(scores[index]),
            )
        )

    return concepts


def generate_structured_notes(
    clean_transcript: str,
    top_concepts: list[TfidfConcept],
    groq_api_key: str,
    groq_base_url: str,
    chat_model: str,
    timeout_seconds: int = _HTTP_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    """Step 9: Generate structured notes JSON with chat completion API."""
    domain_profile_hints = _build_domain_profile_hints(top_concepts)
    concept_lines = "\n".join(
        f"- {concept.concept}: {concept.score:.6f}" for concept in top_concepts
    )
    compact_primary_transcript = _compact_text_for_prompt(
        clean_transcript,
        _MAX_PRIMARY_TRANSCRIPT_CHARS,
    )

    system_prompt = (
        "You are an expert teacher, not a note-taker. "
        "Before writing, internally infer the lecture domain from transcript evidence and treat yourself as a domain expert for that domain. "
        "Convert lecture transcripts into self-contained learning notes for students who missed class and may have zero prior knowledge. "
        "Do not summarize; re-teach from scratch with intuition, worked examples, and beginner-friendly language. "
        "Protect concept integrity: do not map concepts to unrelated domains and do not use analogies from a different field. "
        "Always return strict JSON only with keys: topic, key_concepts, important_points, prerequisites, detailed_explanation."
    )
    user_prompt = (
        "Build teaching notes from the transcript below.\n"
        "Use the TF-IDF concepts as hints, but prioritize transcript accuracy.\n"
        "IMPORTANT: Do NOT summarize. Re-teach from scratch.\n\n"
        "RESPONSE FORMAT:\n"
        "Return valid JSON only (no markdown fences) with these keys:\n"
        "{\n"
        "  \"topic\": string,\n"
        "  \"key_concepts\": string[],\n"
        "  \"important_points\": string[],\n"
        "  \"prerequisites\": string[],\n"
        "  \"detailed_explanation\": string\n"
        "}\n\n"
        "FIELD RULES:\n"
        "1) topic: clear lecture title.\n"
        "2) key_concepts: 5-12 short concept names.\n"
        "3) important_points: 6-15 full-sentence points that capture the class flow.\n"
        "4) prerequisites: beginner-friendly prerequisite ideas; use an empty array if none.\n"
        "5) detailed_explanation: MUST be a single string (not an array or object) and follow EXACTLY this layout:\n"
        "1. INTUITIVE INTRODUCTION\n"
        "- Start with a real-life analogy or simple story.\n"
        "- Assume zero prior knowledge.\n"
        "- Build curiosity first.\n\n"
        "2. CORE IDEA (IN SIMPLE WORDS)\n"
        "- Explain the main concept in plain English.\n"
        "- Avoid jargon at first.\n"
        "- Keep it beginner-friendly.\n\n"
        "3. STEP-BY-STEP EXAMPLE (CODE OR CONCEPTUAL)\n"
        "- Provide one minimal but REAL-WORLD grounded example.\n"
        "- The example format must be chosen from the inferred domain (for example, code behavior, system interaction, physical process, mathematical transformation, or biological mechanism).\n"
        "- Keep it as simple as possible.\n\n"
        "4. LINE-BY-LINE EXPLANATION\n"
        "- Explain each important line or step for a first-time learner.\n"
        "- Include what is happening in an actual system at that step.\n\n"
        "5. CONNECT TO DEFINITIONS\n"
        "- Introduce formal terms now and map them to the example.\n\n"
        "6. COMMON CONFUSIONS\n"
        "- Address likely beginner misunderstandings.\n"
        "- Clarify tricky points.\n\n"
        "7. MINI PRACTICE TASK\n"
        "- Give a small exercise to reinforce learning.\n\n"
        "8. FINAL SUMMARY\n"
        "- Provide a short and clear recap.\n\n"
        "ADDITIONAL RULES:\n"
        "- Use simple language for beginners.\n"
        "- Do not assume prior knowledge unless explicitly present in the transcript.\n"
        "- If the lecturer skips steps, fill in the missing steps.\n"
        "- If examples are unclear, improve them while staying faithful to the topic.\n"
        "- Re-teach the concept from scratch; do not summarize.\n\n"
        "- Analogy correctness rule: only use analogies that preserve the same entities, mechanisms, and constraints as the inferred domain.\n"
        "- Domain analysis should be internal; do not output a separate analysis section.\n"
        f"- Domain evidence hints: {domain_profile_hints}.\n\n"
        f"TF-IDF concepts:\n{concept_lines if concept_lines else '- none'}\n\n"
        f"INPUT TRANSCRIPT:\n{compact_primary_transcript}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    content = _call_groq_chat_completion(
        groq_api_key=groq_api_key,
        groq_base_url=groq_base_url,
        chat_model=chat_model,
        messages=messages,
        timeout_seconds=timeout_seconds,
        temperature=0.2,
    )

    parsed = _parse_json_object(content)
    fallback_concepts = [concept.concept for concept in top_concepts]

    def _to_string_list(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    def _coerce_detailed_explanation(value: Any) -> str:
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, list):
            parts = [str(item).strip() for item in value if str(item).strip()]
            return "\n\n".join(parts)
        if isinstance(value, dict):
            parts: list[str] = []
            for key, item in value.items():
                item_text = str(item).strip()
                if item_text:
                    key_text = str(key).strip()
                    parts.append(f"{key_text}: {item_text}" if key_text else item_text)
            return "\n\n".join(parts)
        return ""

    topic = str(parsed.get("topic", "")).strip() or "Untitled Lecture"
    key_concepts = _to_string_list(parsed.get("key_concepts")) or fallback_concepts
    important_points = _to_string_list(parsed.get("important_points"))
    prerequisites = _to_string_list(parsed.get("prerequisites"))
    detailed_explanation = _coerce_detailed_explanation(parsed.get("detailed_explanation"))

    if not _has_teaching_structure(detailed_explanation):
        compact_rewrite_transcript = _compact_text_for_prompt(
            clean_transcript,
            _MAX_REWRITE_TRANSCRIPT_CHARS,
        )
        compact_draft_explanation = _compact_text_for_prompt(
            detailed_explanation,
            _MAX_DRAFT_EXCERPT_CHARS,
        )
        compact_points = important_points[:_MAX_REWRITE_POINTS]

        rewrite_prompt = (
            "Rewrite ONLY the detailed_explanation text for quality.\n"
            "Return plain text only (not JSON).\n"
            "The text must follow EXACTLY these 8 headings:\n"
            "1. INTUITIVE INTRODUCTION\n"
            "2. CORE IDEA (IN SIMPLE WORDS)\n"
            "3. STEP-BY-STEP EXAMPLE (CODE OR CONCEPTUAL)\n"
            "4. LINE-BY-LINE EXPLANATION\n"
            "5. CONNECT TO DEFINITIONS\n"
            "6. COMMON CONFUSIONS\n"
            "7. MINI PRACTICE TASK\n"
            "8. FINAL SUMMARY\n"
            "Use simple beginner language. Do not summarize. Teach from scratch.\n"
            "Choose example style strictly from the inferred domain and keep mechanism-faithful analogies.\n"
            "Avoid abstract placeholders like 'system A/system B' unless tied to concrete domain actions.\n\n"
            f"Topic: {topic}\n"
            f"Key concepts: {', '.join(key_concepts) if key_concepts else 'none'}\n"
            f"Important points: {' | '.join(compact_points) if compact_points else 'none'}\n"
            f"Prerequisites: {', '.join(prerequisites) if prerequisites else 'none'}\n"
            f"Current weak draft excerpt: {compact_draft_explanation or 'none'}\n\n"
            f"Transcript context:\n{compact_rewrite_transcript}"
        )

        rewrite_content = _call_groq_chat_completion(
            groq_api_key=groq_api_key,
            groq_base_url=groq_base_url,
            chat_model=chat_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": rewrite_prompt},
            ],
            timeout_seconds=timeout_seconds,
            temperature=0.3,
            json_response=False,
        )
        detailed_explanation = _extract_rewritten_explanation(rewrite_content) or detailed_explanation

    if not _has_teaching_structure(detailed_explanation):
        detailed_explanation = _build_structured_teaching_fallback(
            topic=topic,
            key_concepts=key_concepts,
            important_points=important_points,
            prerequisites=prerequisites,
        )

    if not important_points:
        raise PipelineValidationError("Structured notes missing important_points entries.")

    if not detailed_explanation:
        detailed_explanation = " ".join(important_points)

    return {
        "topic": topic,
        "key_concepts": key_concepts,
        "important_points": important_points,
        "prerequisites": prerequisites,
        "detailed_explanation": detailed_explanation,
    }


def process_lecture_pipeline(
    lecturer_audio_path: Path,
    output_dir: Path,
    settings: PipelineSettings,
) -> LectureNotesResult:
    """Orchestrator for Steps 6-9 of the lecture NLP pipeline."""
    transcript_text = transcribe_lecture_audio(
        lecturer_audio_path=lecturer_audio_path,
        groq_api_key=settings.groq_api_key,
        groq_base_url=settings.groq_base_url,
        whisper_model=settings.groq_whisper_model,
        chunk_seconds=settings.transcription_chunk_seconds,
        max_workers=settings.transcription_max_workers,
        timeout_seconds=settings.transcription_timeout_seconds,
    )

    clean_transcript_text_value = clean_transcript_text(transcript_text)
    tfidf_concepts = extract_tfidf_concepts(
        clean_transcript=clean_transcript_text_value,
        top_n=settings.tfidf_top_n,
    )
    structured_notes = generate_structured_notes(
        clean_transcript=clean_transcript_text_value,
        top_concepts=tfidf_concepts,
        groq_api_key=settings.groq_api_key,
        groq_base_url=settings.groq_base_url,
        chat_model=settings.groq_chat_model,
        timeout_seconds=settings.notes_timeout_seconds,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    generated_at_utc = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    persisted_notes = {
        **structured_notes,
        "generated_at_utc": generated_at_utc,
    }
    output_path = _build_notes_output_path(
        output_dir=output_dir,
        topic=str(structured_notes.get("topic", "")),
    )
    try:
        with output_path.open("w", encoding="utf-8") as output_file:
            json.dump(persisted_notes, output_file, ensure_ascii=False, indent=2)
    except OSError as exc:
        raise PipelineRuntimeError(f"Failed to write structured notes to {output_path}") from exc

    return LectureNotesResult(
        topic=str(structured_notes["topic"]),
        key_concepts=list(structured_notes["key_concepts"]),
        important_points=list(structured_notes["important_points"]),
        prerequisites=list(structured_notes["prerequisites"]),
        detailed_explanation=str(structured_notes["detailed_explanation"]),
        transcript_text=transcript_text,
        clean_transcript_text=clean_transcript_text_value,
        tfidf_concepts=tfidf_concepts,
        output_path=output_path,
    )