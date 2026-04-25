// Relay — Screen 4: Patient Info

function _deriveShiftFromTime(iso) {
  const h = new Date(iso).getHours();
  if (h >= 7 && h < 19) return 'Day shift';
  return 'Night shift';
}

function _coerceFlagForUi(f) {
  if (typeof f === 'string') {
    const s = f.trim();
    return { level: 'amber', label: s || '—', source: s };
  }
  if (f && typeof f === 'object') {
    const level = ['red', 'amber', 'green'].includes(f.level) ? f.level : 'amber';
    const lab = (f.label || f.text || '').toString().trim();
    return {
      level,
      label: lab || '—',
      source: (f.source || f.label || '').toString(),
    };
  }
  return { level: 'amber', label: '—', source: '' };
}

function _coerceFlagList(flags) {
  if (!Array.isArray(flags)) return [];
  return flags.map(_coerceFlagForUi);
}

function _coerceOpenLoop(loop) {
  if (typeof loop === 'string') {
    const t = loop.trim();
    return { task: t || '—', owner: 'other', deadline: null };
  }
  if (loop && typeof loop === 'object') {
    const task = (loop.task || loop.text || loop.description || '').toString().trim();
    let owner = loop.owner || 'other';
    if (!['incoming_nurse', 'md', 'pharmacy', 'other'].includes(owner)) owner = 'other';
    return { task: task || '—', owner, deadline: loop.deadline ?? null };
  }
  return { task: '—', owner: 'other', deadline: null };
}

function PatientInfoScreen({ patient, approvedNotes, onGoToPatients }) {
  const [history, setHistory] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const currentRecordId = approvedNotes?._record_id;

  React.useEffect(() => {
    const backendUrl = window.BACKEND_URL || 'http://localhost:8000';
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${backendUrl}/api/patients/by-room/${encodeURIComponent(patient.room)}?limit=10`
        );
        if (!res.ok) throw new Error(`Backend ${res.status}`);
        const records = await res.json();
        if (cancelled) return;

        const others = records.filter((r) => r.id !== currentRecordId);

        const mapped = others.map((r) => ({
          id: r.id,
          nurse: r.nurse_label || 'Previous shift',
          nurse_id: '—',
          timestamp: new Date(r.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          shift: r.shift_label || _deriveShiftFromTime(r.created_at),
          flags: _coerceFlagList(r.flags),
          summary: r.sbar?.situation || '',
        }));

        setHistory(mapped);
      } catch (err) {
        console.warn('History fetch failed, falling back to mock:', err);
        if (!cancelled) setHistory(SESSION_HISTORY[patient.id] || []);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [patient.room, currentRecordId]);

  const notes = approvedNotes;

  const approvalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const approvalDate = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FB', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        onBack={onGoToPatients}
        backLabel="All patients"
        title={patient.name}
        subtitle={`Room ${patient.room} · ${patient.diagnosis}`}
        right={
          <button onClick={onGoToPatients} style={{
            background: '#0F766E', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 18px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <IconUsers size={14} />
            Go to another patient
          </button>
        }
      />

      <main style={{ flex: 1, maxWidth: 860, margin: '0 auto', width: '100%', padding: '28px 24px', boxSizing: 'border-box' }}>

        {/* Patient identity bar */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
          padding: '18px 24px', marginBottom: 20,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{patient.name}</div>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
              <span>Room <strong style={{ fontFamily: "'JetBrains Mono',monospace", color: '#0F172A' }}>{patient.room}</strong></span>
              <span style={{ margin: '0 8px', color: '#CBD5E1' }}>·</span>
              <span>{patient.age}{patient.gender}</span>
              <span style={{ margin: '0 8px', color: '#CBD5E1' }}>·</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{patient.mrn}</span>
            </div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{patient.diagnosis}</div>
          </div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
            <div>Attending: <strong style={{ color: '#334155' }}>{patient.attending}</strong></div>
            <div>Admitted: <strong style={{ color: '#334155' }}>{patient.admit_date}</strong></div>
            <div>Code status: <strong style={{ color: '#334155' }}>{patient.code_status}</strong></div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, textAlign: 'right' }}>Relay recorded</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{approvalDate}</div>
            <div style={{ fontSize: 12, color: '#64748B', textAlign: 'right' }}>{approvalTime} by {NURSE.name}</div>
          </div>
        </div>

        {/* ── ALWAYS VISIBLE: Active Flags ── */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 12, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Active flags</span>
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {notes.flags && notes.flags.length > 0
              ? _coerceFlagList(notes.flags).map((f, i) => <FlagChip key={i} flag={f} />)
              : <span style={{ fontSize: 13, color: '#94A3B8' }}>No flags recorded.</span>
            }
          </div>
        </div>

        {/* ── ALWAYS VISIBLE: Open Loops ── */}
        <OpenLoopsCard loops={(notes.open_loops || []).map(_coerceOpenLoop)} />

        {/* ── COLLAPSIBLE: SBAR ── */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 12, overflow: 'hidden' }}>
          <CollapsibleSection title="SBAR Summary">
            <SbarBlock sbar={notes.sbar} />
          </CollapsibleSection>
        </div>

        {/* ── COLLAPSIBLE: Vitals ── */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 12, overflow: 'hidden' }}>
          <CollapsibleSection title="Vitals & Access">
            <InfoGrid rows={[
              [
                notes.vitals_summary && String(notes.vitals_summary).trim()
                  ? 'Last vitals (this relay)'
                  : 'Last vitals',
                (notes.vitals_summary && String(notes.vitals_summary).trim()) || patient.vitals_summary,
              ],
              ['Weight', patient.weight],
              ['IV access', patient.iv_access],
              ['Diet', patient.diet],
            ]} />
          </CollapsibleSection>
        </div>

        {/* ── COLLAPSIBLE: Medications ── */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 12, overflow: 'hidden' }}>
          <CollapsibleSection title="Medications">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {patient.medications.map((med, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#94A3B8', flexShrink: 0, marginTop: 7 }}></span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{med}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* ── COLLAPSIBLE: Allergies & Precautions ── */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 20, overflow: 'hidden' }}>
          <CollapsibleSection title="Allergies & Precautions">
            <InfoGrid rows={[
              ['Allergies', patient.allergies.join(', ')],
              ['Precautions', patient.precautions.join('; ')],
            ]} />
          </CollapsibleSection>
        </div>

        {/* ── SESSION HISTORY ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Session history</span>
            <span style={{ background: '#F1F5F9', color: '#64748B', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 500 }}>
              {history.length + 1} sessions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Current session — just approved */}
            <SessionCard
              nurse={`${NURSE.name}, ${NURSE.credentials}`}
              nurseId={NURSE.id}
              timestamp={`${approvalDate} — ${approvalTime}`}
              shift="Current session"
              flags={_coerceFlagList(notes.flags || [])}
              summary={notes.sbar?.situation || ''}
              isCurrent
            />

            {/* Past sessions (newest first from API) */}
            {historyLoading ? (
              <div style={{ fontSize: 12, color: '#94A3B8', padding: '12px 0', fontStyle: 'italic' }}>
                Loading session history…
              </div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94A3B8', padding: '12px 0', fontStyle: 'italic' }}>
                No prior sessions for this room.
              </div>
            ) : (
              history.map((s) => (
                <SessionCard
                  key={s.id}
                  nurse={s.nurse}
                  nurseId={s.nurse_id}
                  timestamp={s.timestamp}
                  shift={s.shift}
                  flags={s.flags || []}
                  summary={s.summary}
                />
              ))
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ paddingTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button onClick={onGoToPatients} style={{
            background: '#0F766E', color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 32px',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <IconUsers size={16} />
            Go to another patient
          </button>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid #E2E8F0', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
          Decision support tool. All output requires nurse verification before clinical use. Demo data is fictional.
        </p>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function OpenLoopsCard({ loops }) {
  const [checked, setChecked] = React.useState({});
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 12, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Open loops</span>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {loops && loops.length > 0 ? loops.map((loop, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={() => setChecked(p => ({ ...p, [i]: !p[i] }))}
              style={{ marginTop: 2, accentColor: '#0F766E', flexShrink: 0 }}
            />
            <span style={{
              flex: 1, fontSize: 14, color: checked[i] ? '#94A3B8' : '#0F172A',
              textDecoration: checked[i] ? 'line-through' : 'none',
              lineHeight: 1.4, transition: 'color 0.2s',
            }}>
              {loop.task}
              {loop.deadline && (
                <span style={{ marginLeft: 6, fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono',monospace" }}>
                  by {loop.deadline}
                </span>
              )}
            </span>
            <OwnerBadge owner={loop.owner} />
          </label>
        )) : (
          <span style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>None flagged.</span>
        )}
      </div>
    </div>
  );
}

function SbarBlock({ sbar }) {
  const labels = { situation: 'Situation', background: 'Background', assessment: 'Assessment', recommendation: 'Recommendation' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(labels).map(([key, label]) => sbar[key] ? (
        <div key={key}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.6 }}>{sbar[key]}</div>
        </div>
      ) : null)}
    </div>
  );
}

function InfoGrid({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(([label, value]) => {
        const v = value == null ? '' : String(value);
        const mono = v.includes('mg') || v.includes('BP');
        return (
        <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 120, flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#94A3B8', paddingTop: 1 }}>{label}</div>
          <div style={{ flex: 1, fontSize: 13, color: '#334155', lineHeight: 1.55, fontFamily: mono ? "'JetBrains Mono',monospace" : 'inherit', fontSize: 13 }}>{v}</div>
        </div>
        );
      })}
    </div>
  );
}

function SessionCard({ nurse, nurseId, timestamp, shift, flags, summary, isCurrent }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div style={{
      background: isCurrent ? '#F0FDF4' : '#fff',
      border: `1px solid ${isCurrent ? '#BBF7D0' : '#E2E8F0'}`,
      borderRadius: 10,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Nurse avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isCurrent ? '#DCFCE7' : '#F1F5F9',
          border: `1px solid ${isCurrent ? '#86EFAC' : '#E2E8F0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isCurrent ? '#15803D' : '#64748B', flexShrink: 0,
        }}>
          <IconUser size={15} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{nurse}</span>
            <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono',monospace" }}>#{nurseId}</span>
            {isCurrent && (
              <span style={{ background: '#0F766E', color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 500 }}>
                This session
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <IconClock size={11} />
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{timestamp}</span>
            <span style={{ fontSize: 11, color: '#CBD5E1' }}>·</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{shift}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: summary ? 8 : 0 }}>
            {flags.map((f, i) => <FlagChip key={i} flag={f} small />)}
          </div>
          {summary && (
            <div
              style={{
                fontSize: 12, color: '#64748B', lineHeight: 1.55,
                overflow: 'hidden',
                maxHeight: expanded ? 200 : 40,
                transition: 'max-height 0.25s ease',
              }}
            >
              {summary}
            </div>
          )}
          {summary && summary.length > 100 && (
            <button onClick={() => setExpanded(e => !e)} style={{
              background: 'none', border: 'none', padding: '4px 0 0',
              fontSize: 11, color: '#0F766E', cursor: 'pointer', fontWeight: 500,
            }}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PatientInfoScreen, OpenLoopsCard, SbarBlock, InfoGrid, SessionCard });
