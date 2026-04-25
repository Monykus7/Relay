# Relay

Relay is a clinical handoff documentation assistant built for nursing shift change.

A nurse can dictate or type a natural handoff note, and Relay converts it into a structured, reviewable output (SBAR + flags + open loops) before the note is finalized. The app supports persistence with Postgres so handoffs and room-based history can be surfaced across sessions.

## Why Relay

Shift handoff quality directly impacts continuity of care. Relay is designed to reduce information loss by:

- capturing natural nurse dictation quickly,
- structuring it into a consistent handoff format,
- keeping the original context visible for verification,
- persisting records for room-level continuity.

## Current Features

### Frontend (static React + Babel, no build step)

- Nurse dashboard with a mock assigned patient roster.
- Recording screen with Web Speech API dictation support (Chrome) plus manual text input.
- Live transcript with "generate notes" flow.
- Notes review screen with editable SBAR and open loops.
- Non-blocking verify action on approval.
- Patient info screen showing:
  - current approved session,
  - room-based prior session history from backend,
  - fallback to mock history if backend is unavailable.
- Offline/demo fallback to mock notes if decode fails.

### Backend (FastAPI + NVIDIA + Supabase/Postgres)

- `POST /api/decode` to transform raw handoff text into structured output.
- JSON parsing + strict retry path if model output is malformed.
- Pydantic validation of structured payload.
- Persistence of handoffs and patient records via `asyncpg`.
- `GET /api/handoffs` and `GET /api/handoffs/{id}` for retrieval.
- `GET /api/patients/by-room/{room}` for continuity history.
- `POST /api/patient-records/{id}/verify` to mark record verification.
- NVIDIA model fallback list if the primary model is not provisioned for the API key.

## Tech Stack

- Frontend: React 18 UMD, Babel standalone, plain JSX files
- Voice input: Web Speech API
- Backend: FastAPI, Uvicorn
- LLM integration: NVIDIA NIM (OpenAI-compatible API)
- Database: Supabase Postgres
- DB client: asyncpg

## Repository Structure

```text
Relay/
+-- frontend/
¦   +-- HandoffAI.html
¦   +-- app.jsx
¦   +-- components.jsx
¦   +-- data.js
¦   +-- screen1.jsx
¦   +-- screen2.jsx
¦   +-- screen3.jsx
¦   +-- screen4.jsx
+-- handoffai-backend/
¦   +-- main.py
¦   +-- db.py
¦   +-- models.py
¦   +-- prompts.py
¦   +-- normalize.py
¦   +-- schema.sql
¦   +-- requirements.txt
¦   +-- .env.example
¦   +-- README.md
+-- requirements.txt
+-- README.md
```

## Local Setup

## 1) Backend

```bash
cd handoffai-backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

Create your local env file:

```bash
cp .env.example .env
```

Fill in:

- `NVIDIA_API_KEY`
- `NEMOTRON_MODEL` (optional override)
- `ALLOWED_ORIGINS` (default `http://localhost:5173`)
- `DATABASE_URL` (Supabase Postgres URI)

Run DB schema once in Supabase SQL Editor:

- open `handoffai-backend/schema.sql`
- execute it in your project SQL Editor

Start API:

```bash
uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## 2) Frontend

In a second terminal:

```bash
cd frontend
python -m http.server 5173
```

Open:

- `http://127.0.0.1:5173/HandoffAI.html`

Important:

- Do not open `HandoffAI.html` with `file://...`; serve it over HTTP.
- `window.BACKEND_URL` is set in `frontend/HandoffAI.html` (default `http://localhost:8000`).

## API Summary

- `GET /health`
  - Returns API status and configured primary model.

- `POST /api/decode`
  - Request:
    - `raw_text` (required)
    - `nurse_label` (optional)
    - `shift_label` (optional)
  - Response includes:
    - handoff `id`
    - `patients` array (with per-record `id`)
    - `confidence`

- `GET /api/handoffs?limit=20`
- `GET /api/handoffs/{handoff_id}`
- `GET /api/patients/by-room/{room}?limit=10`
- `POST /api/patient-records/{record_id}/verify`

## Demo Flow (End-to-End)

1. Start backend and frontend servers.
2. Open the patient list.
3. Select a patient and dictate or paste handoff text.
4. Generate notes and review/edit SBAR + open loops.
5. Approve and save.
6. Return to the same room later and confirm prior sessions appear in history.

## Common Issues

- `Could not open requirements file`
  - Ensure you run `pip install -r requirements.txt` in the correct directory.

- Backend `404` at `/`
  - Use `/health` or `/docs`; UI is served separately from `frontend/` static server.

- CORS errors in browser
  - Confirm `ALLOWED_ORIGINS` includes your frontend origin (e.g. `http://localhost:5173`).

- Database DNS / `getaddrinfo failed`
  - Verify `DATABASE_URL` is correct and URL-encoded.
  - If direct `db.<ref>.supabase.co` fails on your network, use Supabase pooler URI.

- Decode returns mock-looking behavior
  - Check browser console and backend logs for decode failures.
  - Confirm backend is running and reachable at `window.BACKEND_URL`.

## Safety and Scope

Relay is a documentation support tool for handoff communication.

- It is not a diagnostic or treatment recommendation system.
- All generated output should be reviewed by a licensed clinician before clinical use.

## Deployment Notes

For production, deploy backend (e.g., Render) and set env vars in the host dashboard. Then set:

- `window.BACKEND_URL` in `frontend/HandoffAI.html` to your deployed backend URL.

## License

This project currently uses the repository's top-level `LICENSE` file.
