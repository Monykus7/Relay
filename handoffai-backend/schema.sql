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
    vitals_summary TEXT,
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

-- One-time for existing databases created before vitals_summary existed:
ALTER TABLE patient_records ADD COLUMN IF NOT EXISTS vitals_summary TEXT;
