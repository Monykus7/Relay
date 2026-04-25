// Relay — Data layer

var NURSE = {
  name: "Sarah Mitchell",
  credentials: "RN, BSN",
  id: "4821",
  unit: "Med-Surg 4 West",
  shift: "Night — 7:00 PM – 7:00 AM",
};

var PATIENTS = [
  {
    id: "p1",
    room: "412",
    name: "Margaret Chen",
    age: 67,
    gender: "F",
    dob: "03/14/1957",
    mrn: "MRN-00412",
    diagnosis: "Post-op Total Knee Replacement, Day 1",
    admit_date: "04/23/2026",
    attending: "Dr. R. Okafor",
    allergies: ["None known"],
    code_status: "Full code",
    last_relay: "07:02 AM",
    key_flag: { level: "amber", label: "K+ low — recheck AM" },
    medications: ["Oxycodone 5mg PO q4h PRN", "Ketorolac 15mg IV q6h", "KCl 40mEq PO x1 (completed)", "Enoxaparin 40mg SQ daily", "Ondansetron 4mg IV PRN nausea"],
    vitals_summary: "BP 118/74, HR 78, Temp 37.1°C, SpO2 97% RA",
    weight: "72 kg",
    diet: "Regular, advance as tolerated",
    iv_access: "18g PIV right AC",
    precautions: ["Fall precautions", "DVT prophylaxis"],
  },
  {
    id: "p2",
    room: "414",
    name: "Arjun Patel",
    age: 72,
    gender: "M",
    dob: "11/02/1953",
    mrn: "MRN-00414",
    diagnosis: "CHF Exacerbation",
    admit_date: "04/21/2026",
    attending: "Dr. L. Haines",
    allergies: ["None known"],
    code_status: "Full code",
    last_relay: "06:48 AM",
    key_flag: { level: "red", label: "BP soft — SBP 95/60" },
    medications: ["Furosemide (Lasix) drip 5mg/hr IV", "Lisinopril 10mg PO daily (held)", "Carvedilol 6.25mg PO BID (held)", "Potassium Chloride 20mEq PO BID"],
    vitals_summary: "BP 95/60 (0200), HR 92, Temp 37.0°C, SpO2 94% 2L NC",
    weight: "88 kg (admit 90 kg)",
    diet: "2g sodium, fluid restriction 1.5L/day",
    iv_access: "20g PIV left hand, PICC right arm",
    precautions: ["Fall precautions", "Fluid restriction"],
  },
  {
    id: "p3",
    room: "416",
    name: "Donna Johnson",
    age: 54,
    gender: "F",
    dob: "07/29/1971",
    mrn: "MRN-00416",
    diagnosis: "Acute Abdominal Pain — Surgical Consult Pending",
    admit_date: "04/23/2026",
    attending: "Dr. M. Torres",
    allergies: ["Penicillin (PCN) — rash"],
    code_status: "Full code",
    last_relay: "06:55 AM",
    key_flag: { level: "red", label: "Allergy: PCN" },
    medications: ["Morphine 4mg IV q4h PRN pain", "Ondansetron 4mg IV q6h PRN", "NS 125mL/hr IV maintenance"],
    vitals_summary: "BP 132/86, HR 104, Temp 37.8°C, SpO2 98% RA",
    weight: "68 kg",
    diet: "NPO past midnight",
    iv_access: "18g PIV left forearm",
    precautions: ["NPO", "PCN allergy — verify all antibiotics"],
  },
  {
    id: "p4",
    room: "418",
    name: "Carlos Garcia",
    age: 61,
    gender: "M",
    dob: "05/11/1964",
    mrn: "MRN-00418",
    diagnosis: "Ischemic Stroke (s/p tPA)",
    admit_date: "04/22/2026",
    attending: "Dr. P. Nwachukwu",
    allergies: ["Sulfa drugs — hives"],
    code_status: "Full code",
    last_relay: "07:15 AM",
    key_flag: { level: "amber", label: "Heparin gtt — PTT due 0600" },
    medications: ["Heparin gtt — per protocol", "Aspirin 81mg PO daily (post-72hr)", "Atorvastatin 80mg PO daily", "Metoprolol 25mg PO BID"],
    vitals_summary: "BP 148/88, HR 68, Temp 36.9°C, SpO2 96% RA",
    weight: "81 kg",
    diet: "Thickened liquids — swallow eval pending",
    iv_access: "20g PIV right AC, 18g PIV left hand",
    precautions: ["Neuro checks q2h", "Aspiration precautions", "Fall precautions"],
  },
  {
    id: "p5",
    room: "420",
    name: "Bridget O'Brien",
    age: 48,
    gender: "F",
    dob: "09/04/1977",
    mrn: "MRN-00420",
    diagnosis: "Community-acquired Pneumonia",
    admit_date: "04/22/2026",
    attending: "Dr. L. Haines",
    allergies: ["None known"],
    code_status: "Full code",
    last_relay: "07:10 AM",
    key_flag: { level: "green", label: "Likely D/C tomorrow" },
    medications: ["Ceftriaxone 1g IV daily", "Azithromycin 500mg PO daily", "Albuterol neb q4h PRN", "Acetaminophen 650mg PO q6h PRN"],
    vitals_summary: "BP 122/78, HR 82, Temp 37.0°C (afebrile since 1800), SpO2 96% RA",
    weight: "64 kg",
    diet: "Regular — eating well",
    iv_access: "20g PIV right forearm",
    precautions: ["Respiratory isolation (droplet — until cultures final)"],
  },
];

// Mock SBAR notes keyed by patient id — used after "recording" simulation
var MOCK_NOTES = {
  p1: {
    sbar: {
      situation: "Post-operative day 1 following right total knee replacement. Patient resting comfortably, vitals stable throughout shift.",
      background: "67-year-old female, no known drug allergies. Admitted 04/23 for elective TKR under Dr. Okafor. K+ noted at 3.1 this AM, repleted with 40 mEq PO.",
      assessment: "Stable post-op course. Hypokalemia under correction. Family communication concern — daughter has called twice requesting surgeon contact. PT cleared for ambulation in AM.",
      recommendation: "Recheck K+ with AM labs. Coordinate surgeon callback with daughter. Ensure PT consult in AM. Continue DVT prophylaxis. Pain well-controlled on current regimen."
    },
    flags: [
      { level: "amber", label: "K+ 3.1 — recheck AM", source: "K+ was 3.1 this AM repleted with 40 mEq PO, recheck in AM" },
      { level: "amber", label: "Family: surgeon callback pending", source: "Daughter called twice tonight, wants to talk to surgeon" }
    ],
    open_loops: [
      { task: "Recheck K+ with AM labs", owner: "incoming_nurse", deadline: "0600" },
      { task: "Coordinate surgeon callback to daughter", owner: "md", deadline: null },
      { task: "PT to clear for ambulation", owner: "other", deadline: "AM" }
    ],
    abbreviations_used: ["TKR", "K+", "PO", "NKDA", "PT", "DVT"]
  },
  p2: {
    sbar: {
      situation: "72-year-old male admitted for CHF exacerbation. On Lasix drip at 5 mg/hr. Blood pressure soft — SBP 95/60 at 0200.",
      background: "Admitted 04/21 with fluid overload. Weight down 2 kg since admission. Lungs have improved per auscultation. Home antihypertensives held.",
      assessment: "Diuresing well — urine output 80 cc/hr last 4 hours. BP soft but has trended up slightly since fluid bolus. Lungs clearer, still with mild bibasilar crackles.",
      recommendation: "Continue Lasix drip. Hold if SBP drops below 90 — notify MD immediately. Hourly BP checks. Daily weight at 0500. Fluid restriction 1.5L enforced."
    },
    flags: [
      { level: "red", label: "BP soft — SBP 95/60", source: "Watch BP, was 95/60 at 0200" },
      { level: "green", label: "Diuresis on track", source: "urine output 80 cc/hr last 4 hours, weight down 2 kg" }
    ],
    open_loops: [
      { task: "Hourly BP checks — hold Lasix if SBP <90, notify MD", owner: "incoming_nurse", deadline: "ongoing" },
      { task: "Daily weight at 0500", owner: "incoming_nurse", deadline: "0500" }
    ],
    abbreviations_used: ["CHF", "UO", "BP", "SBP", "PRN"]
  },
  p3: {
    sbar: {
      situation: "54-year-old female with acute abdominal pain, currently 7/10. NPO past midnight. Surgical consult pending for AM.",
      background: "Admitted 04/23. PCN allergy — rash. Received 4 mg IV morphine at 0100 with good effect. Pain returned to 5/10 by 0400.",
      assessment: "Pain partially controlled. Etiology undetermined pending surgical evaluation. HR slightly elevated at 104, may be pain-related. Temperature 37.8°C — watch for uptrend.",
      recommendation: "Maintain NPO. Page surgery for AM consult by 0700. Reassess pain q2h, morphine PRN per order. Monitor temperature — repeat at 0600. Verify NO penicillin-class antibiotics."
    },
    flags: [
      { level: "red", label: "Allergy: PCN", source: "Allergic to PCN — rash" },
      { level: "amber", label: "NPO post-midnight", source: "NPO past midnight" },
      { level: "amber", label: "Surgical consult pending", source: "surgical consult pending in AM" },
      { level: "amber", label: "Temp 37.8°C — monitor", source: "Temperature 37.8 watch for uptrend" }
    ],
    open_loops: [
      { task: "Page surgery for AM consult", owner: "md", deadline: "0700" },
      { task: "Reassess pain q2h, morphine PRN", owner: "incoming_nurse", deadline: "ongoing" },
      { task: "Repeat temp at 0600 — notify if >38.3°C", owner: "incoming_nurse", deadline: "0600" }
    ],
    abbreviations_used: ["PCN", "NPO", "PRN", "HR", "IV"]
  },
  p4: {
    sbar: {
      situation: "61-year-old male, day 2 post-tPA for ischemic stroke. On heparin gtt per protocol. Neuro checks q2h stable throughout shift.",
      background: "Admitted 04/22. Sulfa allergy. PTT due at 0600 — results pending. Swallow eval not yet completed.",
      assessment: "Neurologically stable — no new deficits noted. BP 148/88, within acceptable post-stroke parameters. Heparin therapeutic range needs confirmation with AM PTT.",
      recommendation: "Draw PTT at 0600 per protocol — adjust heparin per nomogram. Continue neuro checks q2h. Aspiration precautions until swallow eval completed. Follow up swallow eval order."
    },
    flags: [
      { level: "amber", label: "PTT due 0600 — adjust heparin", source: "PTT due at 0600" },
      { level: "amber", label: "Swallow eval pending", source: "swallow eval pending" }
    ],
    open_loops: [
      { task: "Draw PTT at 0600, adjust heparin per nomogram", owner: "incoming_nurse", deadline: "0600" },
      { task: "Follow up swallow eval — order placed?", owner: "other", deadline: "AM" },
      { task: "Continue neuro checks q2h", owner: "incoming_nurse", deadline: "ongoing" }
    ],
    abbreviations_used: ["s/p", "tPA", "PTT", "BP", "q2h", "PRN"]
  },
  p5: {
    sbar: {
      situation: "48-year-old female admitted for community-acquired pneumonia. Afebrile since 1800. Eating well. Likely candidate for discharge tomorrow if cultures remain negative.",
      background: "Admitted 04/22. No known drug allergies. On ceftriaxone and azithromycin. Sputum cultures pending — final results expected AM.",
      assessment: "Clinically improving. SpO2 96% on room air. Afebrile. Tolerating PO. Good candidate for step-down to oral antibiotics and discharge.",
      recommendation: "Check culture results in AM. If negative and vitals stable, anticipate discharge order from Dr. Haines. Educate patient on oral antibiotic course. Ensure follow-up appointment arranged."
    },
    flags: [
      { level: "green", label: "Clinically improving", source: "afebrile since 1800, eating well" },
      { level: "amber", label: "Cultures pending", source: "sputum cultures pending — final results expected AM" }
    ],
    open_loops: [
      { task: "Check culture results — notify MD", owner: "incoming_nurse", deadline: "AM" },
      { task: "Anticipate discharge order if stable", owner: "md", deadline: "AM" },
      { task: "Patient education: oral antibiotic course", owner: "incoming_nurse", deadline: "pre-discharge" }
    ],
    abbreviations_used: ["CAP", "SpO2", "PO", "RA", "D/C"]
  }
};

// Session history per patient
var SESSION_HISTORY = {
  p1: [
    {
      id: "s1-1",
      nurse: "James Okonkwo, RN",
      nurse_id: "3104",
      timestamp: "04/23/2026 — 7:05 AM",
      shift: "Day shift",
      flags: [
        { level: "amber", label: "K+ 3.1 — monitor" },
        { level: "green", label: "Post-op stable" }
      ],
      summary: "Patient returned from OR at 2200. Vitals stable. Pain managed with oxycodone. K+ repleted."
    },
    {
      id: "s1-2",
      nurse: "Priya Rajan, RN",
      nurse_id: "2987",
      timestamp: "04/23/2026 — 7:00 PM",
      shift: "Evening shift",
      flags: [
        { level: "amber", label: "K+ trending low" },
        { level: "amber", label: "Daughter requesting updates" }
      ],
      summary: "Patient alert and oriented. Tolerated dinner. Daughter called x2. PT evaluation completed — cleared for morning ambulation."
    },
  ],
  p2: [
    {
      id: "s2-1",
      nurse: "Tamara Webb, RN",
      nurse_id: "3356",
      timestamp: "04/22/2026 — 7:00 AM",
      shift: "Day shift",
      flags: [
        { level: "red", label: "Fluid overload — crackles bilat" },
        { level: "amber", label: "SpO2 91% on RA" }
      ],
      summary: "Patient admitted via ED for acute decompensated CHF. Lasix drip initiated. SpO2 improved on 2L NC."
    },
    {
      id: "s2-2",
      nurse: "James Okonkwo, RN",
      nurse_id: "3104",
      timestamp: "04/22/2026 — 7:05 PM",
      shift: "Evening shift",
      flags: [
        { level: "amber", label: "BP soft — 100/62" },
        { level: "green", label: "UO improving" }
      ],
      summary: "Good diuresis. Weight down 1 kg. BP on the lower end — Lasix rate held at 5 mg/hr per MD. Home meds held."
    },
  ],
  p3: [
    {
      id: "s3-1",
      nurse: "Tamara Webb, RN",
      nurse_id: "3356",
      timestamp: "04/23/2026 — 7:05 PM",
      shift: "Evening shift",
      flags: [
        { level: "red", label: "Allergy: PCN" },
        { level: "amber", label: "Abdominal pain 8/10" }
      ],
      summary: "Admitted via ED with acute abd pain. Surgical team notified. PCN allergy prominently documented. Morphine x1 given with partial relief."
    },
  ],
  p4: [
    {
      id: "s4-1",
      nurse: "Priya Rajan, RN",
      nurse_id: "2987",
      timestamp: "04/22/2026 — 7:00 AM",
      shift: "Day shift",
      flags: [
        { level: "red", label: "Acute stroke — tPA given" },
        { level: "amber", label: "Neuro checks q1h" }
      ],
      summary: "Patient presented with acute ischemic stroke, tPA administered in ED. Transferred to floor post-tPA. Neuro status stable. Heparin initiated per protocol."
    },
    {
      id: "s4-2",
      nurse: "James Okonkwo, RN",
      nurse_id: "3104",
      timestamp: "04/22/2026 — 7:10 PM",
      shift: "Evening shift",
      flags: [
        { level: "amber", label: "PTT subtherapeutic — adjusted" },
        { level: "amber", label: "Swallow eval ordered" }
      ],
      summary: "Heparin adjusted per nomogram. Neuro checks downgraded to q2h — stable. Swallow eval ordered, pending scheduling. Thickened liquids initiated."
    },
  ],
  p5: [
    {
      id: "s5-1",
      nurse: "Tamara Webb, RN",
      nurse_id: "3356",
      timestamp: "04/22/2026 — 7:05 PM",
      shift: "Evening shift",
      flags: [
        { level: "amber", label: "Temp 38.6°C on admit" },
        { level: "amber", label: "SpO2 93% RA" }
      ],
      summary: "Admitted from urgent care with productive cough x5 days, fever, hypoxia. Started on ceftriaxone and azithromycin. Sputum cultures sent."
    },
    {
      id: "s5-2",
      nurse: "James Okonkwo, RN",
      nurse_id: "3104",
      timestamp: "04/23/2026 — 7:00 AM",
      shift: "Day shift",
      flags: [
        { level: "green", label: "Afebrile — improving" },
        { level: "amber", label: "Cultures pending" }
      ],
      summary: "Patient markedly improved. Afebrile, SpO2 up to 96% RA. Tolerating PO well. Discussed possible discharge tomorrow with patient and family."
    },
  ],
};

var SYSTEM_PROMPT = `You are a clinical relay assistant for nurses. The user provides a raw nurse-to-nurse dictation for a single patient. Return ONLY valid JSON in this shape — no preamble, no markdown:

{
  "sbar": {
    "situation": "...",
    "background": "...",
    "assessment": "...",
    "recommendation": "..."
  },
  "flags": [
    { "level": "red|amber|green", "label": "...", "source": "exact phrase from input" }
  ],
  "open_loops": [
    { "task": "...", "owner": "incoming_nurse|md|pharmacy|other", "deadline": "string or null" }
  ],
  "abbreviations_used": ["..."]
}

Rules: never invent clinical detail; red = critical, amber = watch, green = routine; open loops are tasks for the next shift.`;

// Expose all data globally so Babel-compiled scripts can access them
var BACKEND_URL = "http://localhost:8000";

Object.assign(window, { BACKEND_URL, NURSE, PATIENTS, MOCK_NOTES, SESSION_HISTORY, SYSTEM_PROMPT });
