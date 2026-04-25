// Relay — App root (state machine)

function App() {
  // screen: 'patient-list' | 'recording' | 'notes-preview' | 'patient-info'
  const [screen, setScreen] = React.useState('patient-list');
  const [selectedPatient, setSelectedPatient] = React.useState(null);
  const [transcript, setTranscript] = React.useState('');
  const [generatedNotes, setGeneratedNotes] = React.useState(null);
  const [approvedNotes, setApprovedNotes] = React.useState(null);

  // Restore last session from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('relay:session');
      if (saved) {
        const s = JSON.parse(saved);
        // Only restore to patient-list; don't drop mid-flow state on reload
        if (s.screen === 'patient-info' && s.patientId && s.approvedNotes) {
          const patient = PATIENTS.find(p => p.id === s.patientId);
          if (patient) {
            setSelectedPatient(patient);
            setApprovedNotes(s.approvedNotes);
            setScreen('patient-info');
          }
        }
      }
    } catch(e) {}
  }, []);

  // Persist state
  React.useEffect(() => {
    if (screen === 'patient-info' && selectedPatient && approvedNotes) {
      localStorage.setItem('relay:session', JSON.stringify({
        screen: 'patient-info',
        patientId: selectedPatient.id,
        approvedNotes,
      }));
    }
  }, [screen, selectedPatient, approvedNotes]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setTranscript('');
    setGeneratedNotes(null);
    setScreen('recording');
  };

  const handleProcessed = (notes, rawTranscript) => {
    setGeneratedNotes(notes);
    setTranscript(rawTranscript);
    setScreen('notes-preview');
  };

  const handleApprove = (editedNotes) => {
    setApprovedNotes(editedNotes);
    setScreen('patient-info');
  };

  const handleGoToPatients = () => {
    localStorage.removeItem('relay:session');
    setScreen('patient-list');
    setSelectedPatient(null);
    setGeneratedNotes(null);
    setApprovedNotes(null);
    setTranscript('');
  };

  if (screen === 'patient-list') {
    return <PatientListScreen onSelectPatient={handleSelectPatient} />;
  }
  if (screen === 'recording') {
    return (
      <RecordingScreen
        patient={selectedPatient}
        onBack={() => setScreen('patient-list')}
        onProcessed={handleProcessed}
      />
    );
  }
  if (screen === 'notes-preview') {
    return (
      <NotesPreviewScreen
        patient={selectedPatient}
        notes={generatedNotes}
        transcript={transcript}
        onBack={() => setScreen('recording')}
        onApprove={handleApprove}
      />
    );
  }
  if (screen === 'patient-info') {
    return (
      <PatientInfoScreen
        patient={selectedPatient}
        approvedNotes={approvedNotes}
        onGoToPatients={handleGoToPatients}
      />
    );
  }
  return null;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
