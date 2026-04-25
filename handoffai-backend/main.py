import os
import json
import re
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import APIStatusError, AsyncOpenAI, NotFoundError
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import db
from models import DecodeRequest, DecodeResponse
from prompts import SYSTEM_PROMPT, STRICTER_RETRY_ADDENDUM

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("handoffai")

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NEMOTRON_MODEL = os.getenv("NEMOTRON_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")
# If primary returns 404 ("Function not found for account"), try these in order (same integrate.api.nvidia.com).
_NIM_FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv(
        "NIM_FALLBACK_MODELS",
        "meta/llama-3.1-70b-instruct,nvidia/llama-3.1-nemotron-nano-8b-v1",
    ).split(",")
    if m.strip()
]
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
]

if not NVIDIA_API_KEY:
    raise RuntimeError("NVIDIA_API_KEY is required.")

client = AsyncOpenAI(
    api_key=NVIDIA_API_KEY,
    base_url="https://integrate.api.nvidia.com/v1",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(title="HandoffAI", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.lovable\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def safe_parse_json(raw: str) -> dict:
    s = raw.strip()
    s = re.sub(r"^```json\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"^```\s*", "", s)
    s = re.sub(r"\s*```$", "", s)
    return json.loads(s.strip())


def _nim_model_candidates() -> list[str]:
    out = [NEMOTRON_MODEL]
    for m in _NIM_FALLBACK_MODELS:
        if m not in out:
            out.append(m)
    return out


async def call_nemotron(raw_text: str, system_prompt: str) -> str:
    """Call NVIDIA NIM OpenAI-compatible chat. Retries on 404 when model is not enabled for the API key."""
    candidates = _nim_model_candidates()
    last_404: str | None = None
    for model in candidates:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": raw_text},
                ],
                temperature=0.2,
                max_tokens=2500,
            )
            text = response.choices[0].message.content or ""
            if model != NEMOTRON_MODEL:
                logger.warning(
                    "NIM used fallback model %s (primary %s was not available for this key)",
                    model,
                    NEMOTRON_MODEL,
                )
            else:
                logger.info("NIM completion model=%s", model)
            return text
        except NotFoundError as e:
            last_404 = str(e)[:400]
            logger.warning("NIM 404 for model=%s — trying next candidate if any", model)
            continue
        except APIStatusError as e:
            logger.error("NIM API error model=%s status=%s: %s", model, e.status_code, e.message)
            raise HTTPException(
                status_code=502,
                detail=f"NVIDIA API error ({e.status_code}) for model {model}: {e.message}",
            ) from e
    raise HTTPException(
        status_code=502,
        detail=(
            "No NVIDIA NIM chat model is available for this API key (404 for all tried models). "
            f"Tried: {', '.join(candidates)}. Last error: {last_404 or 'unknown'}. "
            "Fix: open https://build.nvidia.com, open the model you want (e.g. Llama 3.1 Nemotron 70B Instruct), "
            "click Get API Key / generate access so your account is provisioned for that endpoint, then retry. "
            "Or set NEMOTRON_MODEL in .env to a model id shown on that model's page."
        ),
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": NEMOTRON_MODEL}


@app.post("/api/decode")
async def decode(req: DecodeRequest):
    raw = await call_nemotron(req.raw_text, SYSTEM_PROMPT)

    try:
        parsed = safe_parse_json(raw)
    except json.JSONDecodeError:
        logger.warning("first-pass JSON parse failed; retrying with stricter prompt")
        retry_prompt = SYSTEM_PROMPT + STRICTER_RETRY_ADDENDUM
        raw = await call_nemotron(req.raw_text, retry_prompt)
        try:
            parsed = safe_parse_json(raw)
        except json.JSONDecodeError as e:
            logger.error(f"retry JSON parse failed: {e}")
            logger.error(f"raw model output: {raw[:500]}")
            raise HTTPException(status_code=502, detail="Model returned invalid JSON after retry")

    try:
        validated = DecodeResponse(**parsed)
    except Exception as e:
        logger.error(f"schema validation failed: {e}")
        raise HTTPException(status_code=502, detail=f"Schema validation: {e}")

    response_dict = validated.model_dump()
    handoff_id, patient_row_ids = await db.save_handoff(
        req.raw_text,
        response_dict,
        nurse_label=req.nurse_label,
        shift_label=req.shift_label,
    )
    patients_out = []
    for idx, patient in enumerate(response_dict.get("patients", [])):
        row_id = patient_row_ids[idx] if idx < len(patient_row_ids) else None
        patients_out.append({**patient, "id": row_id})
    return {"id": handoff_id, **{**response_dict, "patients": patients_out}}


@app.get("/api/handoffs")
async def list_handoffs_endpoint(limit: int = 20):
    return await db.list_handoffs(limit=min(max(limit, 1), 100))


@app.get("/api/handoffs/{handoff_id}")
async def get_handoff_endpoint(handoff_id: str):
    handoff = await db.get_handoff(handoff_id)
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found")
    return handoff


@app.get("/api/patients/by-room/{room}")
async def get_patient_history(room: str, limit: int = 10):
    return await db.get_patient_history_by_room(room, limit=min(max(limit, 1), 50))


@app.post("/api/patient-records/{record_id}/verify")
async def verify_patient(record_id: str):
    success = await db.mark_patient_verified(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return {"verified": True}
