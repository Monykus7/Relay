from typing import Any, Optional

from pydantic import BaseModel, Field


class PatientItem(BaseModel):
    model_config = {"extra": "ignore"}

    room: str | None = None
    name_or_label: str
    sbar: dict[str, Any]
    flags: list[Any] = Field(default_factory=list)
    open_loops: list[Any] = Field(default_factory=list)
    abbreviations_used: list[Any] = Field(default_factory=list)


class DecodeRequest(BaseModel):
    raw_text: str = Field(..., min_length=10, max_length=10000)
    nurse_label: Optional[str] = None
    shift_label: Optional[str] = None


class DecodeResponse(BaseModel):
    model_config = {"extra": "ignore"}

    confidence: str = "medium"
    patients: list[PatientItem]
