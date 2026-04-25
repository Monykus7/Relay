// HandoffAI — Screen 2: Recording

function RecordingScreen({ patient, onBack, onProcessed }) {
  const [recording, setRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [speechSupported] = React.useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const recognitionRef = React.useRef(null);
  const transcriptRef = React.useRef(null);

  // Auto-scroll transcript
  React.useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleMic = () => {
    if (!speechSupported) return;
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let baseText = transcript;
    recognition.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { final += e.results[i][0].transcript + ' '; }
        else interim += e.results[i][0].transcript;
      }
      if (final) { baseText = baseText + final; setTranscript(baseText); }
      else setTranscript(baseText + interim);
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const handleProcess = async () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
    }
    setProcessing(true);

    const backendUrl = window.BACKEND_URL || 'http://localhost:8000';

    try {
      const res = await fetch(`${backendUrl}/api/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: transcript,
          nurse_label: `${NURSE.name}, ${NURSE.credentials}`,
          shift_label: NURSE.shift,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `Backend ${res.status}` }));
        const detail = err.detail;
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
              : JSON.stringify(detail || err);
        throw new Error(msg || `Backend returned ${res.status}`);
      }

      const data = await res.json();
      const patientRecord = data.patients?.[0];
      if (!patientRecord) throw new Error('Backend returned no patient records');

      const notes = {
        sbar: patientRecord.sbar,
        flags: patientRecord.flags || [],
        open_loops: patientRecord.open_loops || [],
        abbreviations_used: patientRecord.abbreviations_used || [],
        vitals_summary: patientRecord.vitals_summary || null,
        _handoff_id: data.id,
        _record_id: patientRecord.id,
      };

      setProcessing(false);
      onProcessed(notes, transcript);
    } catch (err) {
      console.error('Backend decode failed, falling back to mock:', err);
      setProcessing(false);
      const fallback = MOCK_NOTES[patient.id] || MOCK_NOTES['p1'];
      onProcessed({ ...fallback, _handoff_id: null, _record_id: null }, transcript);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FB', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        onBack={onBack}
        backLabel="Patients"
        title={patient.name}
        subtitle={`Room ${patient.room} · ${patient.diagnosis}`}
        right={
          recording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Waveform />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#EF4444' }}>Recording…</span>
            </div>
          ) : null
        }
      />

      <main style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

        {/* Left: Patient summary */}
        <div style={{
          width: 340, flexShrink: 0,
          borderRight: '1px solid #E2E8F0',
          background: '#fff',
          overflowY: 'auto',
          padding: '24px 20px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Patient Summary
          </div>

          {/* Identity */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{patient.name}</div>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              <div>Room <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#0F172A' }}>{patient.room}</span> &nbsp;·&nbsp; {patient.age}{patient.gender}</div>
              <div>MRN: <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{patient.mrn}</span></div>
              <div style={{ marginTop: 4 }}>{patient.diagnosis}</div>
              <div style={{ marginTop: 2 }}>Attending: {patient.attending}</div>
            </div>
          </div>

          {/* Flags */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Active flags</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FlagChip flag={patient.key_flag} />
              {patient.allergies[0] !== 'None known' && patient.allergies.map((a, i) => (
                <FlagChip key={i} flag={{ level: 'red', label: `Allergy: ${a}` }} />
              ))}
            </div>
          </div>

          {/* Vitals */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Last vitals</div>
            <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.8, fontFamily: "'JetBrains Mono',monospace" }}>{patient.vitals_summary}</div>
          </div>

          {/* Precautions */}
          {patient.precautions && patient.precautions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Precautions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {patient.precautions.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }}></span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Transcript + controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Live transcript
          </div>

          {/* Transcript area */}
          <div
            ref={transcriptRef}
            style={{
              flex: 1,
              background: '#fff', border: `1px solid ${recording ? '#FCA5A5' : '#E2E8F0'}`,
              borderRadius: 10,
              padding: '20px 24px',
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 14, lineHeight: 1.8, color: '#0F172A',
              overflowY: 'auto',
              marginBottom: 20,
              minHeight: 300,
              transition: 'border-color 0.2s',
              position: 'relative',
            }}
          >
            {transcript ? (
              <span>{transcript}</span>
            ) : (
              <span style={{ color: '#CBD5E1', fontStyle: 'italic', fontSize: 13 }}>
                {recording
                  ? 'Listening… speak clearly into your microphone.'
                  : speechSupported
                    ? 'Press the mic button to start recording, or type directly here.'
                    : 'Paste or type your handoff notes here.'}
              </span>
            )}
            {recording && (
              <span style={{
                display: 'inline-block',
                width: 2, height: '1em',
                background: '#EF4444',
                marginLeft: 2,
                animation: 'blink 1s step-end infinite',
                verticalAlign: 'text-bottom',
              }}></span>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {speechSupported ? (
              <button
                aria-label="Toggle voice dictation"
                aria-pressed={recording}
                onClick={handleMic}
                disabled={processing}
                style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: recording ? '#EF4444' : '#0F766E',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: recording ? 'pulseRed 1.2s infinite' : 'none',
                  transition: 'background 0.2s',
                }}
              >
                {recording ? <IconMicOff size={20} /> : <IconMic size={20} />}
              </button>
            ) : (
              <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                Use Chrome for voice, or type/paste above.
              </div>
            )}

            <div style={{ flex: 1 }}>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Or type / paste your handoff notes here…"
                style={{
                  width: '100%', background: 'none', border: 'none', outline: 'none',
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#64748B',
                  resize: 'none', height: 36, lineHeight: 1.5,
                  display: 'none',
                }}
              />
            </div>

            <button
              onClick={handleProcess}
              disabled={!transcript.trim() || processing}
              style={{
                height: 48, borderRadius: 10,
                background: !transcript.trim() || processing ? '#E2E8F0' : '#0F766E',
                color: !transcript.trim() || processing ? '#94A3B8' : '#fff',
                border: 'none',
                cursor: !transcript.trim() || processing ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 500,
                padding: '0 28px',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
            >
              {processing ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: processing ? '#94A3B8' : '#fff',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }}></span>
                  Generating notes…
                </>
              ) : 'Stop & generate notes →'}
            </button>
          </div>

          {!speechSupported && (
            <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginTop: 10 }}>
              Voice dictation requires Chrome. You can paste from Wispr Flow or Dragon Medical.
            </p>
          )}
        </div>
      </main>

      <style>{`
        @keyframes pulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 10px rgba(239,68,68,0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

Object.assign(window, { RecordingScreen });
