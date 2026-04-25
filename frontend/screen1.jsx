// HandoffAI — Screen 1: Patient List (Nurse Dashboard)

function PatientListScreen({ onSelectPatient }) {
  const flagOrder = { red: 0, amber: 1, green: 2 };
  const sorted = [...PATIENTS].sort((a, b) => flagOrder[a.key_flag.level] - flagOrder[b.key_flag.level]);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FB', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        right={
          <span style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}>
            DEMO — Synthetic data only
          </span>
        }
      />

      <main style={{ flex: 1, maxWidth: 960, margin: '0 auto', width: '100%', padding: '32px 24px', boxSizing: 'border-box' }}>

        {/* Nurse badge */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
          padding: '18px 24px', marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0F766E', flexShrink: 0,
          }}>
            <IconUser size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
              {NURSE.name}, {NURSE.credentials}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Badge #{NURSE.id} &nbsp;·&nbsp; {NURSE.unit} &nbsp;·&nbsp; {NURSE.shift}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>Patients assigned</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{PATIENTS.length}</div>
          </div>
        </div>

        {/* Section header */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>Your patients</h1>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>Select a patient to begin handoff</span>
        </div>

        {/* Patient tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(patient => (
            <PatientTile key={patient.id} patient={patient} onSelect={() => onSelectPatient(patient)} />
          ))}
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

function PatientTile({ patient, onSelect }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? '#0F766E' : '#E2E8F0'}`,
        borderRadius: 10,
        padding: '16px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: hovered ? '0 0 0 3px rgba(15,118,110,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex', alignItems: 'center', gap: 20,
      }}
    >
      {/* Room badge */}
      <div style={{
        width: 52, height: 52, borderRadius: 10,
        background: '#F8FAFC', border: '1px solid #E2E8F0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Room</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{patient.room}</span>
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{patient.name}</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{patient.age}{patient.gender} &nbsp;·&nbsp; MRN {patient.mrn}</span>
        </div>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 8, lineHeight: 1.4 }}>{patient.diagnosis}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FlagChip flag={patient.key_flag} small />
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8' }}>
            <IconClock size={11} />
            Last handoff {patient.last_handoff}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div style={{ color: hovered ? '#0F766E' : '#CBD5E1', flexShrink: 0, transition: 'color 0.15s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  );
}

Object.assign(window, { PatientListScreen, PatientTile });
