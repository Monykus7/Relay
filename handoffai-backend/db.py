import os
import json
import logging
import socket
from uuid import UUID
from typing import Optional
from urllib.parse import urlparse
import asyncpg

logger = logging.getLogger("handoffai.db")


def _normalize_database_url(raw: str) -> str:
    s = (raw or "").strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        s = s[1:-1].strip()
    return s


def _database_url_or_raise() -> str:
    url = _normalize_database_url(os.getenv("DATABASE_URL", ""))
    if not url:
        raise RuntimeError("DATABASE_URL is required. Set it in your .env file.")
    parsed = urlparse(url.replace("postgresql+asyncpg://", "postgresql://", 1))
    if not parsed.hostname:
        raise RuntimeError(
            "DATABASE_URL has no hostname (DNS name). Common causes: "
            "password contains @ or : without URL-encoding (%40, %3A); "
            "extra spaces or quotes; or you left a placeholder like YOUR_PROJECT in the host."
        )
    if "YOUR_PROJECT" in parsed.hostname or "YOUR-PASSWORD" in url.upper():
        raise RuntimeError(
            "DATABASE_URL still contains a placeholder. Replace YOUR_PROJECT and the password "
            "with your real Supabase project ref and database password from the dashboard."
        )
    return url


DATABASE_URL = _database_url_or_raise()

_pool: Optional[asyncpg.Pool] = None


async def init_pool() -> None:
    """Initialize the connection pool. Called once at app startup."""
    global _pool
    parsed = urlparse(
        DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
    )
    host = parsed.hostname or ""
    try:
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            ssl="require",
            min_size=1,
            max_size=5,
            command_timeout=15,
        )
    except socket.gaierror as e:
        hint = ""
        if host.startswith("db.") and host.endswith(".supabase.co"):
            hint = (
                " Supabase direct hosts (db.*.supabase.co) often publish only IPv6 in DNS. "
                "If your network or OS path cannot use IPv6, switch DATABASE_URL to the "
                "Session pooler or Transaction pooler URI from Supabase → Project Settings → "
                "Database → Connection string (those hosts usually resolve over IPv4)."
            )
        raise RuntimeError(
            f"Could not resolve database host {host!r} (DNS / network).{hint} "
            "Also verify the URI from the dashboard, URL-encode special characters in the password, "
            "and try another network or disable VPN to rule out DNS filtering."
        ) from e
    logger.info("Postgres pool initialized")


async def close_pool() -> None:
    if _pool is not None:
        await _pool.close()


def _pool_or_raise() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Did lifespan run?")
    return _pool


async def save_handoff(
    raw_input: str,
    response: dict,
    nurse_label: Optional[str] = None,
    shift_label: Optional[str] = None,
) -> tuple[str, list[str]]:
    """Insert a handoff and one row per patient. Returns (handoff_id, patient_record_ids in order)."""
    pool = _pool_or_raise()
    async with pool.acquire() as conn:
        async with conn.transaction():
            handoff_id = await conn.fetchval(
                """
                INSERT INTO handoffs (raw_input, structured_output, confidence, nurse_label, shift_label)
                VALUES ($1, $2::jsonb, $3, $4, $5)
                RETURNING id
                """,
                raw_input,
                json.dumps(response),
                response.get("confidence", "medium"),
                nurse_label,
                shift_label,
            )

            patient_ids: list[str] = []
            for patient in response.get("patients", []):
                name_or_label = patient.get("name_or_label") or "Unnamed patient"
                rid = await conn.fetchval(
                    """
                    INSERT INTO patient_records
                        (handoff_id, room, name_or_label, sbar,
                         flags, open_loops, abbreviations_used, vitals_summary)
                    VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8)
                    RETURNING id
                    """,
                    handoff_id,
                    patient.get("room"),
                    name_or_label,
                    json.dumps(patient["sbar"]),
                    json.dumps(patient.get("flags", [])),
                    json.dumps(patient.get("open_loops", [])),
                    json.dumps(patient.get("abbreviations_used", [])),
                    patient.get("vitals_summary"),
                )
                patient_ids.append(str(rid))

            return str(handoff_id), patient_ids


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
            SELECT pr.id, pr.handoff_id, pr.created_at, pr.room, pr.name_or_label,
                   pr.sbar, pr.flags, pr.open_loops, pr.verified, pr.vitals_summary,
                   h.nurse_label, h.shift_label
            FROM patient_records pr
            LEFT JOIN handoffs h ON h.id = pr.handoff_id
            WHERE pr.room = $1
            ORDER BY pr.created_at DESC
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
    out = {
        "id": str(row["id"]),
        "handoff_id": str(row["handoff_id"]),
        "created_at": row["created_at"].isoformat(),
        "room": row["room"],
        "name_or_label": row["name_or_label"],
        "sbar": json.loads(row["sbar"]),
        "flags": json.loads(row["flags"]),
        "open_loops": json.loads(row["open_loops"]),
        "verified": row["verified"],
        "nurse_label": row["nurse_label"],
        "shift_label": row["shift_label"],
    }
    vs = row.get("vitals_summary")
    if vs is not None:
        out["vitals_summary"] = vs
    return out
