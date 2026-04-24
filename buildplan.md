# HandoffAI — Database Addendum (Supabase + asyncpg)

> Addendum to the backend Cursor plan. Adds Postgres persistence via Supabase. Keep both files together when handing to whoever builds the backend.

## What persistence unlocks for the demo

Three new behaviors the stateless version can't do:

- **Continuity.** "Show me the previous handoff for Room 412" — the receiving nurse sees what the previous shift said about the same patient, automatically.
- **Audit trail.** Every decode call is logged with timestamp and structured output. This is the answer to the HIPAA compliance question, not just words.
- **Verification persistence.** A nurse marking a patient card as verified survives reload, device switch, and shift change.

For the demo, the continuity story is the headliner. Generate one handoff for Room 412 at the start, generate a follow-up handoff for the same room a minute later, show the app surfacing the prior context. That's a 30-second demo beat that's hard to fake without a database.

## Stack additions

- **Supabase** for managed Postgres (you already have it set up).
- **asyncpg** for direct Postgres access from FastAPI. Pure async, fast, no ORM overhead.
- Two tables: `handoffs` and `patient_records`. No migrations framework — single `schema.sql` you run once in the Supabase SQL editor.

## Updated file structure

```
handoffai-backend/
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
├── main.py           # updated: lifespan, new endpoints
├── models.py         # updated: response includes id
├── prompts.py
├── db.py             # NEW
└── schema.sql        # NEW
```

## Updated `requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
openai==1.55.0
pydantic==2.9.0
python-dotenv==1.0.1
asyncpg==0.30.0
```

## Updated `.env.example`

```
NVIDIA_API_KEY=nvapi-replace-me
NEMOTRON_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
```

The real `DATABASE_URL` goes in your local `.env` only. `.env` stays gitignored. Set the same variable in Render's dashboard for production. Don't commit it. Don't paste it in screenshots. Rotate the password after the hackathon ends.

## Step 1 — Run the schema

Open Supabase → SQL Editor → New query. Paste this and run:

### `schema.sql`

```sql
-- Enable UUID generation (built into Postgres 13+ via pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Each generated handoff: raw input + full structured output
CREATE TABLE IF NOT EXISTS handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_input TEXT NOT NULL,
    structured_output JSONB NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'medium',
    shift_label TEXT,
    nurse_label TEXT
);

CREATE INDEX IF NOT EXISTS idx_handoffs_created_at
    ON handoffs (created_at DESC);

-- Denormalized patient rows for room-based lookup and verification state
CREATE TABLE IF NOT EXISTS patient_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handoff_id UUID NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
    room TEXT,
    name_or_label TEXT NOT NULL,
    sbar JSONB NOT NULL,
    flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    open_loops JSONB NOT NULL DEFAULT '[]'::jsonb,
    abbreviations_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_records_handoff_id
    ON patient_records (handoff_id);
CREATE INDEX IF NOT EXISTS idx_patient_records_room
    ON patient_records (room) WHERE room IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_records_created_at
    ON patient_records (created_at DESC);
```

Verify in the Supabase Table Editor that both tables exist with the right columns.

## Step 2 — `db.py`

```python
import os
import json
import logging
from uuid import UUID
from typing import Optional
import asyncpg

logger = logging.getLogger("handoffai.db")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required. Set it in your .env file.")

_pool: Optional[asyncpg.Pool] = None


async def init_pool() -> None:
    """Initialize the connection pool. Called once at app startup."""
    global _pool
    _pool = await asyncpg.create_pool(
        DATABASE_URL,
        ssl="require",
        min_size=1,
        max_size=5,
        command_timeout=15,
    )
    logger.info("Postgres pool initialized")


async def close_pool() -> None:
    if _pool is not None:
        await _pool.close()


def _pool_or_raise() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Did lifespan run?")
    return _pool


async def save_handoff(raw_input: str, response: dict) -> str:
    """Insert a handoff and one row per patient. Returns handoff id."""
    pool = _pool_or_raise()
    async with pool.acquire() as conn:
        async with conn.transaction():
            handoff_id = await conn.fetchval(
                """
                INSERT INTO handoffs (raw_input, structured_output, confidence)
                VALUES ($1, $2::jsonb, $3)
                RETURNING id
                """,
                raw_input,
                json.dumps(response),
                response.get("confidence", "medium"),
            )

            for patient in response.get("patients", []):
                await conn.execute(
                    """
                    INSERT INTO patient_records
                        (handoff_id, room, name_or_label, sbar,
                         flags, open_loops, abbreviations_used)
                    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb)
                    """,
                    handoff_id,
                    patient.get("room"),
                    patient["name_or_label"],
                    json.dumps(patient["sbar"]),
                    json.dumps(patient.get("flags", [])),
                    json.dumps(patient.get("open_loops", [])),
                    json.dumps(patient.get("abbreviations_used", [])),
                )

            return str(handoff_id)


async def list_handoffs(limit: int = 20) -> list[dict]:
    pool = _pool_or_raise()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, created_at, raw_input, structured_output, confidence
            FROM handoffs
            ORDER BY created_at DESC
            LIMIT $1
            """,
            limit,
        )
        return [_row_to_handoff(r) for r in rows]


async def get_handoff(handoff_id: str) -> Optional[dict]:
    pool = _pool_or_raise()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, created_at, raw_input, structured_output, confidence "
            "FROM handoffs WHERE id = $1",
            UUID(handoff_id),
        )
        return _row_to_handoff(row) if row else None


async def get_patient_history_by_room(room: str, limit: int = 10) -> list[dict]:
    """Return prior patient records for a given room, newest first."""
    pool = _pool_or_raise()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, handoff_id, created_at, room, name_or_label,
                   sbar, flags, open_loops, verified
            FROM patient_records
            WHERE room = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            room,
            limit,
        )
        return [_row_to_patient(r) for r in rows]


async def mark_patient_verified(record_id: str) -> bool:
    pool = _pool_or_raise()
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE patient_records
            SET verified = TRUE, verified_at = NOW()
            WHERE id = $1
            """,
            UUID(record_id),
        )
        return result.endswith("1")


def _row_to_handoff(row) -> dict:
    return {
        "id": str(row["id"]),
        "created_at": row["created_at"].isoformat(),
        "raw_input": row["raw_input"],
        "structured_output": json.loads(row["structured_output"]),
        "confidence": row["confidence"],
    }


def _row_to_patient(row) -> dict:
    return {
        "id": str(row["id"]),
        "handoff_id": str(row["handoff_id"]),
        "created_at": row["created_at"].isoformat(),
        "room": row["room"],
        "name_or_label": row["name_or_label"],
        "sbar": json.loads(row["sbar"]),
        "flags": json.loads(row["flags"]),
        "open_loops": json.loads(row["open_loops"]),
        "verified": row["verified"],
    }
```

`ssl="require"` is mandatory for Supabase — they reject non-SSL connections. asyncpg accepts the string shorthand.

## Step 3 — Updated `main.py`

Three changes from the previous version: lifespan to manage the pool, decode endpoint persists results, four new read endpoints.

```python
import os
import json
import re
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from dotenv import load_dotenv

import db
from models import DecodeRequest, DecodeResponse
from prompts import SYSTEM_PROMPT, STRICTER_RETRY_ADDENDUM

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("handoffai")

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NEMOTRON_MODEL = os.getenv("NEMOTRON_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")
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


async def call_nemotron(raw_text: str, system_prompt: str) -> str:
    response = await client.chat.completions.create(
        model=NEMOTRON_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw_text},
        ],
        temperature=0.2,
        max_tokens=2500,
    )
    return response.choices[0].message.content or ""


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
    handoff_id = await db.save_handoff(req.raw_text, response_dict)
    return {"id": handoff_id, **response_dict}


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
```

## New endpoints summary

- `POST /api/decode` — unchanged shape on input. Response now includes `id` field for the saved handoff.
- `GET /api/handoffs?limit=20` — recent handoffs feed.
- `GET /api/handoffs/{id}` — single handoff retrieval.
- `GET /api/patients/by-room/{room}` — historical records for a room (this is the continuity story endpoint).
- `POST /api/patient-records/{id}/verify` — mark a patient card as verified.

## Cursor prompt to add the database layer

If you've already built the backend without the database, paste this into Cursor:

> Add a Postgres persistence layer to this FastAPI backend using asyncpg and Supabase.
>
> Create a new file `db.py` with: a global asyncpg pool, `init_pool()` and `close_pool()` functions called from the FastAPI lifespan, and async functions for `save_handoff`, `list_handoffs`, `get_handoff`, `get_patient_history_by_room`, `mark_patient_verified`. Use `ssl="require"` since Supabase requires SSL.
>
> Update `main.py` to use a lifespan context manager that initializes and closes the pool. The `/api/decode` endpoint should call `save_handoff` after validation and include the resulting `id` in its response. Add four new endpoints: `GET /api/handoffs`, `GET /api/handoffs/{id}`, `GET /api/patients/by-room/{room}`, `POST /api/patient-records/{id}/verify`.
>
> Add `asyncpg==0.30.0` to requirements.txt. Add `DATABASE_URL` to .env.example with placeholder value.
>
> Create `schema.sql` with two tables: `handoffs` (id, created_at, raw_input, structured_output JSONB, confidence, shift_label, nurse_label) and `patient_records` (id, handoff_id FK to handoffs, room, name_or_label, sbar JSONB, flags JSONB, open_loops JSONB, abbreviations_used JSONB, verified, verified_at, created_at). Index handoffs by created_at DESC, patient_records by handoff_id, room (where not null), and created_at DESC. Use `gen_random_uuid()` for primary keys with the pgcrypto extension.
>
> Use the reference code I'm pasting next as the source of truth for exact field names and SQL.

Then paste the `db.py`, `schema.sql`, and updated `main.py` code blocks above.

## Frontend integration — the continuity moment

Add one new behavior to the Lovable frontend. After a decode response renders, for each patient card with a non-null `room`, fire a request to `GET /api/patients/by-room/{room}?limit=3`. If results come back AND any of them have a `created_at` older than the current one, show a small badge on the card: **"Previous handoff available"**, clickable, opens a modal showing the prior SBAR.

Pseudocode for the Lovable side:

```ts
async function loadPriorHandoff(room: string, currentRecordId: string) {
  const res = await fetch(`${BACKEND_URL}/api/patients/by-room/${encodeURIComponent(room)}?limit=3`);
  const records = await res.json();
  return records.filter((r: any) => r.id !== currentRecordId);
}
```

This is the demo beat that justifies the database. Without it, the database is a checkbox feature judges won't notice.

## Updated build order — total ~50 minutes for backend

- **0-5 min:** Cursor mega-prompt for the original FastAPI scaffold + reference code paste.
- **5-10 min:** `pip install`, `.env` setup, `uvicorn` boots, `/health` returns ok.
- **10-15 min:** Run `schema.sql` in Supabase SQL Editor. Verify both tables exist.
- **15-25 min:** Add `db.py` and update `main.py` with the second Cursor prompt + reference code.
- **25-30 min:** Test `/api/decode`, then `/api/handoffs` to confirm the row landed. Test `/api/patients/by-room/412` after running two decodes for the same room.
- **30-40 min:** Push to GitHub, deploy to Render with `NVIDIA_API_KEY` and `DATABASE_URL` set in dashboard env.
- **40-50 min:** Frontend integration of the continuity badge in Lovable. Test end-to-end.

If you hit minute 30 and the database integration is fighting you, ship without it — the original stateless backend still demos fine. Don't sink the demo trying to save an upgrade.

## Common issues

- **`ssl_required` or connection rejected.** asyncpg needs `ssl="require"` for Supabase. Already in the reference code, but if you wrote your own pool config, add it.
- **`UndefinedFunctionError: function gen_random_uuid() does not exist`.** The pgcrypto extension isn't enabled. The first line of `schema.sql` enables it — if you skipped that line, run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` separately.
- **`relation "handoffs" does not exist`.** Schema didn't run. Check the Supabase SQL Editor history. Re-run `schema.sql`.
- **Render build fails on asyncpg.** Sometimes asyncpg needs a build toolchain. Render usually handles this, but if it fails, add to your build command: `pip install --upgrade pip && pip install -r requirements.txt`.
- **Connections exhausted on Render free tier.** Direct connection limit is ~60. For the hackathon you're nowhere near that. If you scale up post-hackathon, switch to the Supabase **transaction pooler** URL (port 6543, host `aws-0-REGION.pooler.supabase.com`). Code stays the same, just swap the env var.
- **`null value in column "name_or_label" violates not-null constraint`.** Nemotron returned a patient without a name field. Either make the column nullable or default it in `save_handoff` to `"Unnamed patient"`. The latter is safer for downstream UI.

## Stretch — only if everything else is done

- **Audit log table.** Append every API call to an `audit_log` table with timestamp, endpoint, status, duration, and a hash of the input. Serves the HIPAA conversation directly.
- **Soft delete.** Add `deleted_at TIMESTAMPTZ` to both tables and filter on it. Hospitals never hard-delete clinical records.
- **Row-level security.** Supabase supports RLS. Enable it on both tables, scope by a future `org_id` column. Strong production-readiness signal.

None of these are demo-critical. Don't start them until you can run the demo end-to-end without breaking a sweat.

---

## Configuration cheat sheet — every key, every place

This is the single source of truth for what goes where. Have it open in another tab while you're configuring.

### The three places things get configured

| Where | What lives there | When you set it |
|---|---|---|
| `.env` file in backend repo | All four backend env vars | Local dev, before first `uvicorn` boot |
| Render dashboard → Service → Environment | All four backend env vars (again, separately) | After deploying to Render |
| Lovable → Project settings → Environment | One frontend var (`VITE_BACKEND_URL`) | After Render deploy gives you a URL |

The backend env vars are duplicated across local `.env` and Render dashboard — they don't share, you set both.

### Where each value comes from

**`NVIDIA_API_KEY`**
- Go to build.nvidia.com, sign in.
- Search for "Llama 3.1 Nemotron 70B Instruct" (or whatever model you're running).
- Click the model card. On the right side, click "Get API Key".
- Copy the key — starts with `nvapi-`. Store it once; it won't be shown again.

**`NEMOTRON_MODEL`**
- This is the model string, not a secret. Default value: `nvidia/llama-3.1-nemotron-70b-instruct`.
- Only change this if you swap to Nano for speed: `nvidia/llama-3.1-nemotron-nano-8b-v1`.
- If unset, the backend code falls back to the 70B default.

**`DATABASE_URL`**
- Supabase dashboard → your project → Project Settings (gear icon, bottom left) → Database.
- Scroll to "Connection string" → click the URI tab.
- Copy the string. It looks like `postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres`.
- The password placeholder `[YOUR-PASSWORD]` in Supabase's UI is literal — replace it with the actual password you set when creating the project.
- If you forgot the password: Settings → Database → Reset database password.

**`ALLOWED_ORIGINS`**
- This is your frontend's URL, comma-separated if multiple.
- For local dev: `http://localhost:5173`.
- For production: add your deployed Lovable URL too — but the `main.py` code already wildcards `*.lovable.app`, so you don't need to update this when Lovable's preview URL changes.
- Final value: `http://localhost:5173`.

**`VITE_BACKEND_URL`**
- This is your deployed Render backend's URL.
- After deploying to Render, copy the URL from the top of the service page. Looks like `https://handoffai-backend.onrender.com` (or whatever you named it).
- No trailing slash.

### Backend — local `.env` file

Copy `.env.example` to `.env` and fill in:

```
NVIDIA_API_KEY=nvapi-paste-your-real-key-here
NEMOTRON_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

Your `DATABASE_URL` is the connection string from Supabase — you have it. Paste it directly here. Do not commit this file.

### Backend — Render dashboard

After pushing to GitHub and connecting the repo to Render:

1. Render service page → Environment (left sidebar).
2. Click "Add Environment Variable" four times. Add each:

| Key | Value |
|---|---|
| `NVIDIA_API_KEY` | `nvapi-...` (same as local) |
| `NEMOTRON_MODEL` | `nvidia/llama-3.1-nemotron-70b-instruct` |
| `ALLOWED_ORIGINS` | `http://localhost:5173` |
| `DATABASE_URL` | full Supabase URI |

3. Click "Save Changes". Render auto-redeploys with the new env.
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend — Lovable environment

In Lovable:

1. Project settings → Environment Variables (or whatever Lovable currently calls it — the location moves around occasionally).
2. Add one variable:

| Key | Value |
|---|---|
| `VITE_BACKEND_URL` | `https://YOUR-RENDER-APP.onrender.com` |

3. Redeploy the Lovable preview.
4. Confirm in browser DevTools → Network tab that requests are going to your Render URL, not localhost or NVIDIA.

If Lovable doesn't have an environment variable feature exposed, hardcode `BACKEND_URL` in the relevant component and accept that you'll need to swap it back to `import.meta.env.VITE_BACKEND_URL` for the post-hackathon production version.

### Setup order — do not skip steps

1. **Schema first.** Run `schema.sql` in Supabase SQL Editor. Confirm two tables exist.
2. **Backend local.** Fill `.env`, run `uvicorn main:app --reload`, hit `/health`. Should return ok.
3. **Decode test.** `curl` the decode endpoint with a sample. Should return JSON with an `id`.
4. **DB write check.** In Supabase Table Editor, open `handoffs` table. The row from step 3 should be there.
5. **Push to GitHub.** Don't include `.env`. Confirm `.gitignore` has it.
6. **Render deploy.** Connect repo, set the four env vars, deploy. Hit `/health` on the Render URL.
7. **Lovable env.** Set `VITE_BACKEND_URL` to the Render URL.
8. **End-to-end.** Open the Lovable preview, generate a handoff, confirm: cards render, row appears in Supabase, second decode for same room shows the continuity badge.

If any step fails, fix it before moving forward. A broken step 4 means step 6 will be broken in a way that's harder to debug.

### Verification checklist — run these before demo

```bash
# 1. Backend health (replace with your Render URL)
curl https://YOUR-RENDER-APP.onrender.com/health
# Expect: {"status":"ok","model":"nvidia/llama-3.1-nemotron-70b-instruct"}

# 2. Decode endpoint
curl -X POST https://YOUR-RENDER-APP.onrender.com/api/decode \
  -H "Content-Type: application/json" \
  -d '{"raw_text":"Room 412, Mrs. Chen, post-op TKR day 1, K+ 3.1 repleted, NKDA, daughter called twice"}'
# Expect: JSON with "id", "patients" array

# 3. List handoffs (confirms DB write)
curl https://YOUR-RENDER-APP.onrender.com/api/handoffs?limit=5
# Expect: array with at least one entry

# 4. Patient history by room
curl https://YOUR-RENDER-APP.onrender.com/api/patients/by-room/412
# Expect: array with the Mrs. Chen record from step 2
```

If all four return as expected, the backend is fully wired and you can focus on the frontend.

### Pre-demo warm-up routine

Render free tier sleeps after 15 minutes idle. First request takes ~30 seconds. **One minute before you walk on stage:**

```bash
curl https://YOUR-RENDER-APP.onrender.com/health
```

This wakes the container so the first judge interaction is instant. Set a phone reminder. Forgetting this is the #1 reason hackathon demos look broken.

### Post-hackathon cleanup checklist

When you shut things down Friday:

- [ ] Rotate the Supabase database password (Settings → Database → Reset password).
- [ ] Revoke the NVIDIA API key (build.nvidia.com → API Keys → revoke).
- [ ] Delete the Render service if you don't plan to maintain it.
- [ ] If the GitHub repo is public, double-check `.env` was never committed (`git log --all --full-history -- .env` should return nothing).
- [ ] Remove the API key from any Lovable environment if the project stays alive in any form.

That's everything. You should now have one place to look up every value, every variable, and every place those variables need to land.