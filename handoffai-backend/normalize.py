"""Normalize LLM patient payloads to the shape the HandoffAI UI expects."""

from typing import Any


def _normalize_flag_item(item: Any) -> dict[str, Any]:
    if isinstance(item, str):
        s = item.strip()
        return {"level": "amber", "label": s or "Flag", "source": s}
    if isinstance(item, dict):
        lvl = item.get("level") or item.get("severity") or "amber"
        if lvl not in ("red", "amber", "green"):
            lvl = "amber"
        label = item.get("label") or item.get("text") or item.get("message") or ""
        src = item.get("source") or label
        return {"level": lvl, "label": str(label).strip() or "Flag", "source": str(src).strip()}
    return {"level": "amber", "label": str(item).strip() or "Flag", "source": ""}


def _normalize_loop_item(item: Any) -> dict[str, Any]:
    if isinstance(item, str):
        t = item.strip()
        return {"task": t or "Task", "owner": "other", "deadline": None}
    if isinstance(item, dict):
        task = item.get("task") or item.get("text") or item.get("description") or ""
        owner = item.get("owner") or "other"
        if owner not in ("incoming_nurse", "md", "pharmacy", "other"):
            owner = "other"
        return {
            "task": str(task).strip() or "Task",
            "owner": owner,
            "deadline": item.get("deadline"),
        }
    return {"task": str(item).strip() or "Task", "owner": "other", "deadline": None}


def normalize_patients_for_ui(patients: list[dict]) -> None:
    """Mutates each patient dict in place."""
    for p in patients:
        raw_flags = p.get("flags") or []
        p["flags"] = [_normalize_flag_item(f) for f in raw_flags]
        raw_loops = p.get("open_loops") or []
        p["open_loops"] = [_normalize_loop_item(x) for x in raw_loops]
        vs = p.get("vitals_summary")
        if vs is not None:
            s = str(vs).strip()
            if s:
                p["vitals_summary"] = s
            else:
                p.pop("vitals_summary", None)
