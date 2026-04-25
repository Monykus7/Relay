// Relay — Screen 3: Notes Preview (Review & Approve)

function NotesPreviewScreen({ patient, notes, transcript, onBack, onApprove }) {
  const [editedNotes, setEditedNotes] = React.useState(() =>
    normalizeRelayNotesForEditor(JSON.parse(JSON.stringify(notes)))
  );
  const [checkedLoops, setCheckedLoops] = React.useState({});
  const [approved, setApproved] = React.useState(false);

  const updateSbar = (field, value) => {
    setEditedNotes(n => ({ ...n, sbar: { ...n.sbar, [field]: value } }));
  };

  const updateLoopTask = (i, value) => {
    setEditedNotes(n => {
      const loops = [...n.open_loops];
      loops[i] = { ...loops[i], task: value };
      return { ...n, open_loops: loops };
    });
  };

  const handleApprove = async () => {
    setApproved(true);

    const recordId = editedNotes._record_id;
    if (recordId) {
      const backendUrl = window.BACKEND_URL || 'http://localhost:8000';
      fetch(`${backendUrl}/api/patient-records/${recordId}/verify`, { method: 'POST' }).catch((e) =>
        console.warn('Verify call failed (non-blocking):', e)
      );
    }

    setTimeout(() => onApprove(editedNotes, transcript), 600);
  };

  const sbarLabels = {
    situation:      'Situation',
    background:     'Background',
    assessment:     'Assessment',
    recommendation: 'Recommendation',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FB', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        onBack={onBack}
        backLabel="Re-record"
        title={`Review notes — ${patient.name}`}
        subtitle={`Room ${patient.room} · ${patient.diagnosis}`}
        right={
          <button
            onClick={handleApprove}
            disabled={approved}
            style={{
              background: approved ? '#F0FDF4' : '#0F766E',
              color: approved ? '#166534' : '#fff',
              border: approved ? '1px solid #BBF7D0' : 'none',
              borderRadius: 8, padding: '9px 22px',
              fontSize: 14, fontWeight: 500, cursor: approved ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.3s',
            }}
          >
            {approved ? <><IconCheck size={14} /> Approved</> : 'Approve & save →'}
          </button>
        }
      />

      <main style={{ flex: 1, maxWidth: 860, margin: '0 auto', width: '100%', padding: '28px 24px', boxSizing: 'border-box' }}>

        {/* Banner */}
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
          padding: '10px 16px', marginBottom: 24,
          fontSize: 13, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <IconEdit size={13} />
          All fields are editable. Review carefully before approving — this becomes the official relay record.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* SBAR */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>SBAR Summary</span>
              <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Click any field to edit</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(sbarLabels).map(([key, label]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    {label}
                  </label>
                  <textarea
                    value={editedNotes.sbar[key] || ''}
                    onChange={e => updateSbar(key, e.target.value)}
                    rows={key === 'recommendation' ? 3 : 2}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: '1px solid #E2E8F0', borderRadius: 7,
                      padding: '10px 12px',
                      fontSize: 14, lineHeight: 1.6, color: '#0F172A',
                      fontFamily: "'Inter',sans-serif",
                      resize: 'vertical', outline: 'none',
                      transition: 'border-color 0.15s',
                      background: '#FAFBFC',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0F766E'}
                    onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Flags */}
          {editedNotes.flags && editedNotes.flags.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Flags</span>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {editedNotes.flags.map((f, i) => <FlagChip key={i} flag={f} />)}
              </div>
            </div>
          )}

          {/* Open Loops */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Open loops</span>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editedNotes.open_loops && editedNotes.open_loops.length > 0 ? (
                editedNotes.open_loops.map((loop, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={!!checkedLoops[i]}
                      onChange={() => setCheckedLoops(p => ({ ...p, [i]: !p[i] }))}
                      style={{ marginTop: 10, accentColor: '#0F766E', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={loop.task}
                      onChange={e => updateLoopTask(i, e.target.value)}
                      style={{
                        flex: 1, border: '1px solid #E2E8F0', borderRadius: 6,
                        padding: '7px 10px', fontSize: 13, color: checkedLoops[i] ? '#94A3B8' : '#0F172A',
                        fontFamily: "'Inter',sans-serif", outline: 'none',
                        textDecoration: checkedLoops[i] ? 'line-through' : 'none',
                        transition: 'border-color 0.15s',
                        background: '#FAFBFC',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0F766E'}
                      onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                    />
                    {loop.deadline && (
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#94A3B8', marginTop: 9, flexShrink: 0 }}>
                        {loop.deadline}
                      </span>
                    )}
                    <OwnerBadge owner={loop.owner} />
                  </div>
                ))
              ) : (
                <span style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>None flagged.</span>
              )}
            </div>
          </div>

          {/* Approve footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button onClick={onBack} style={{
              background: '#fff', color: '#475569',
              border: '1px solid #E2E8F0', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>← Re-record</button>
            <button onClick={handleApprove} disabled={approved} style={{
              background: approved ? '#F0FDF4' : '#0F766E',
              color: approved ? '#166534' : '#fff',
              border: approved ? '1px solid #BBF7D0' : 'none',
              borderRadius: 8, padding: '10px 28px',
              fontSize: 14, fontWeight: 500, cursor: approved ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.3s',
            }}>
              {approved ? <><IconCheck size={14} /> Saved</> : 'Approve & save →'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { NotesPreviewScreen });
