// HandoffAI — Shared UI Components

// ── Icons ─────────────────────────────────────────────────────────────────
function IconMic({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  );
}
function IconMicOff({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M18.89 13.23A7 7 0 0 0 19 12M5 10a7 7 0 0 0 12.9 2.5"/>
      <rect x="9" y="2" width="6" height="12" rx="3" opacity="0.4"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  );
}
function IconChevron({ open, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconArrowLeft({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}
function IconUser({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconClock({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconAlertCircle({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function IconEdit({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconUsers({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

// ── FlagChip ──────────────────────────────────────────────────────────────
function FlagChip({ flag, small }) {
  const [showTip, setShowTip] = React.useState(false);
  const f =
    typeof flag === 'string'
      ? { level: 'amber', label: flag.trim() || '—', source: flag }
      : flag && typeof flag === 'object'
        ? flag
        : { level: 'amber', label: '—', source: '' };
  const level = ['red', 'amber', 'green'].includes(f.level) ? f.level : 'amber';
  const label = f.label != null && String(f.label).trim() !== '' ? f.label : '—';
  const source = f.source != null ? String(f.source) : '';
  const colors = {
    red:   { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', dot: '#EF4444' },
    amber: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', dot: '#F59E0B' },
    green: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', dot: '#22C55E' },
  };
  const c = colors[level] || colors.amber;
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: c.bg, color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: 999,
        padding: small ? '3px 8px' : '4px 10px',
        fontSize: small ? 11 : 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => source && setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }}></span>
      {label}
      {showTip && source && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A', color: '#fff',
          padding: '6px 10px', borderRadius: 6,
          fontSize: 11, lineHeight: 1.4,
          whiteSpace: 'normal', width: 220,
          zIndex: 100, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <span style={{ color: '#94A3B8', display: 'block', marginBottom: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</span>
          "{source}"
        </span>
      )}
    </span>
  );
}

// ── OwnerBadge ─────────────────────────────────────────────────────────────
function OwnerBadge({ owner }) {
  const map = {
    incoming_nurse: { label: 'Incoming nurse', bg: '#EFF6FF', color: '#1E40AF' },
    md:             { label: 'MD',             bg: '#F5F3FF', color: '#5B21B6' },
    pharmacy:       { label: 'Pharmacy',        bg: '#FFF7ED', color: '#C2410C' },
    other:          { label: 'Other',           bg: '#F8FAFC', color: '#475569' },
  };
  const s = map[owner] || map.other;
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}22`,
      borderRadius: 4, padding: '2px 7px',
      fontSize: 11, fontWeight: 500, flexShrink: 0,
    }}>{s.label}</span>
  );
}

// ── AppHeader ─────────────────────────────────────────────────────────────
function AppHeader({ onBack, backLabel, title, subtitle, right }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#fff', borderBottom: '1px solid #E2E8F0',
      height: 64,
      display: 'flex', alignItems: 'center',
      padding: '0 32px', gap: 16,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid #E2E8F0',
          borderRadius: 7, padding: '6px 12px',
          fontSize: 13, fontWeight: 500, color: '#475569',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <IconArrowLeft size={14} />
          {backLabel || 'Back'}
        </button>
      )}
      <div style={{ flex: 1 }}>
        {!onBack && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0F766E', display: 'inline-block' }}></span>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>HandoffAI</span>
          </div>
        )}
        {title && onBack && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{subtitle}</div>}
          </div>
        )}
        {!onBack && (
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, paddingLeft: 16 }}>Voice-first clinical handoff intelligence.</div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </header>
  );
}

// ── Collapsible Section ───────────────────────────────────────────────────
function CollapsibleSection({ title, defaultOpen = false, children, accent }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #F1F5F9' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 20px', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: accent || '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
          {title}
        </span>
        <IconChevron open={open} />
      </button>
      {open && (
        <div style={{ padding: '4px 20px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Normalize API/mock notes so flags/open_loops match editor + FlagChip shape. */
function normalizeHandoffNotesForEditor(notes) {
  if (!notes || typeof notes !== 'object') return {};
  const out = { ...notes };
  out.flags = (Array.isArray(out.flags) ? out.flags : []).map((f) => {
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
  });
  out.open_loops = (Array.isArray(out.open_loops) ? out.open_loops : []).map((loop) => {
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
  });
  return out;
}

// ── Waveform animation (recording indicator) ──────────────────────────────
function Waveform() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
      <style>{`
        @keyframes wave1 { 0%,100%{height:4px} 50%{height:16px} }
        @keyframes wave2 { 0%,100%{height:8px} 50%{height:20px} }
        @keyframes wave3 { 0%,100%{height:12px} 50%{height:6px} }
        @keyframes wave4 { 0%,100%{height:6px} 50%{height:18px} }
        @keyframes wave5 { 0%,100%{height:10px} 50%{height:4px} }
      `}</style>
      {['wave1','wave2','wave3','wave4','wave5'].map((a, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: '#EF4444',
          animation: `${a} ${0.7 + i * 0.1}s ease-in-out infinite`,
          animationDelay: `${i * 0.07}s`,
        }}></div>
      ))}
    </div>
  );
}

Object.assign(window, {
  // Icons
  IconMic, IconMicOff, IconChevron, IconCheck,
  IconArrowLeft, IconUser, IconClock, IconAlertCircle, IconEdit, IconUsers,
  // Components
  FlagChip, OwnerBadge, AppHeader, CollapsibleSection, Waveform,
  normalizeHandoffNotesForEditor,
});
