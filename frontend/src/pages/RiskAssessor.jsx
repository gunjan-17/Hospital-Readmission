import { useState } from "react";

const API = "http://localhost:5000/api";

const FIELDS = [
  { key: "age",                label: "Age Group (encoded)",       type: "range", min: 0, max: 9,  step: 1,  hint: "0=[0-10) … 9=[90-100)" },
  { key: "time_in_hospital",   label: "Days in Hospital",          type: "range", min: 1, max: 14, step: 1,  hint: "Current/most recent stay" },
  { key: "num_medications",    label: "Number of Medications",     type: "range", min: 1, max: 81, step: 1,  hint: "Total distinct medications" },
  { key: "num_lab_procedures", label: "Lab Procedures",            type: "range", min: 1, max: 132,step: 1,  hint: "Number of lab tests done" },
  { key: "num_procedures",     label: "Non-Lab Procedures",        type: "range", min: 0, max: 6,  step: 1,  hint: "Procedures other than lab" },
  { key: "number_diagnoses",   label: "Number of Diagnoses",       type: "range", min: 1, max: 16, step: 1,  hint: "Total diagnoses recorded" },
  { key: "number_inpatient",   label: "Prior Inpatient Visits",    type: "range", min: 0, max: 21, step: 1,  hint: "Inpatient visits in past year" },
  { key: "number_outpatient",  label: "Prior Outpatient Visits",   type: "range", min: 0, max: 42, step: 1,  hint: "Outpatient visits in past year" },
  { key: "number_emergency",   label: "Emergency Visits",          type: "range", min: 0, max: 76, step: 1,  hint: "Emergency visits in past year" },
];

const DEFAULTS = {
  age: 5, time_in_hospital: 4, num_medications: 12,
  num_lab_procedures: 40, num_procedures: 1, number_diagnoses: 6,
  number_inpatient: 1, number_outpatient: 0, number_emergency: 0,
};

function Spinner() {
  return <div style={s.spinner} />;
}

function RiskBadge({ label, prob }) {
  const config = {
    High:     { bg: "rgba(231,76,60,0.15)",  border: "#e74c3c", color: "#e74c3c",  icon: "🔴" },
    Moderate: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", color: "#f59e0b",  icon: "🟡" },
    Low:      { bg: "rgba(46,204,113,0.15)", border: "#2ecc71", color: "#2ecc71",  icon: "🟢" },
  }[label] || {};
  return (
    <div style={{ ...s.riskBadge, background: config.bg, border: `1px solid ${config.border}` }}>
      <span style={s.riskIcon}>{config.icon}</span>
      <div>
        <div style={{ ...s.riskLabel, color: config.color }}>{label} Risk</div>
        <div style={s.riskProb}>{prob}% probability of readmission</div>
      </div>
    </div>
  );
}

export default function RiskAssessor() {
  const [form,       setForm]    = useState(DEFAULTS);
  const [result,     setResult]  = useState(null);
  const [stayResult, setStay]    = useState(null);
  const [loading,    setLoading] = useState(false);
  const [error,      setError]   = useState(null);

  const handleChange = (key, val) =>
    setForm((f) => ({ ...f, [key]: Number(val) }));

  const handleAssess = async () => {
    setLoading(true); setError(null); setResult(null); setStay(null);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch(`${API}/predict-readmission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        fetch(`${API}/predict-stay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
      ]);
      const r = await rRes.json();
      const s = await sRes.json();
      if (r.error) throw new Error(r.error);
      setResult(r);
      setStay(s);
    } catch (e) {
      setError(e.message || "API error. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.layout}>
      {/* ── Left: Input Form ── */}
      <div style={s.formPanel}>
        <div style={s.panelHeader}>
          <div style={s.panelTitle}>Patient Parameters</div>
          <div style={s.panelSub}>Adjust sliders to match patient profile</div>
        </div>

        <div style={s.fieldsWrap}>
          {FIELDS.map((f) => (
            <div key={f.key} style={s.fieldRow}>
              <div style={s.fieldTop}>
                <label style={s.fieldLabel}>{f.label}</label>
                <span style={s.fieldValue}>{form[f.key]}</span>
              </div>
              <input
                type="range"
                min={f.min} max={f.max} step={f.step}
                value={form[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                style={s.slider}
              />
              <div style={s.fieldHint}>{f.hint}</div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAssess}
          disabled={loading}
          style={{ ...s.assessBtn, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <><Spinner /> Assessing…</> : "◈  Assess Readmission Risk"}
        </button>

        {error && (
          <div style={s.errorBox}>⚠ {error}</div>
        )}
      </div>

      {/* ── Right: Results ── */}
      <div style={s.resultPanel}>
        {!result && !loading && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>◈</div>
            <div style={s.emptyTitle}>No Assessment Yet</div>
            <div style={s.emptySub}>Adjust the patient parameters on the left and click <strong style={{ color: "#e74c3c" }}>Assess Readmission Risk</strong>.</div>
          </div>
        )}

        {loading && (
          <div style={s.loadingState}>
            <div style={s.bigSpinner} />
            <div style={s.loadingText}>Running models…</div>
          </div>
        )}

        {result && (
          <div className="fade-up">
            {/* Risk Badge */}
            <RiskBadge label={result.risk_label} prob={result.probability_pct} />

            {/* Probability Bar */}
            <div style={s.probSection}>
              <div style={s.probHeader}>
                <span style={s.probTitle}>Readmission Probability</span>
                <span style={s.probPct}>{result.probability_pct}%</span>
              </div>
              <div style={s.probTrack}>
                <div style={{
                  ...s.probFill,
                  width: `${result.probability_pct}%`,
                  background: result.risk_label === "High" ? "#e74c3c"
                            : result.risk_label === "Moderate" ? "#f59e0b" : "#2ecc71",
                }} />
                {/* Threshold markers */}
                <div style={{ ...s.marker, left: "40%" }} title="Moderate threshold (40%)" />
                <div style={{ ...s.marker, left: "70%" }} title="High threshold (70%)" />
              </div>
              <div style={s.probScale}>
                <span>0%</span>
                <span style={s.markerLow}>Low</span>
                <span style={s.markerMod}>Moderate</span>
                <span style={s.markerHigh}>High</span>
                <span>100%</span>
              </div>
            </div>

            {/* Top Reasons */}
            <div style={s.reasonsSection}>
              <div style={s.sectionLabel}>⚡ Contributing Factors</div>
              {result.top_reasons.map((r, i) => (
                <div key={i} style={s.reasonRow}>
                  <div style={{ ...s.reasonNum, background: i === 0 ? "#e74c3c" : i === 1 ? "#f59e0b" : "#3b82f6" }}>
                    {i + 1}
                  </div>
                  <span style={s.reasonText}>{r}</span>
                </div>
              ))}
            </div>

            {/* Cluster + Stay side by side */}
            <div style={s.infoGrid}>
              <div style={s.infoCard}>
                <div style={s.infoIcon}>◉</div>
                <div style={s.infoLabel}>Patient Segment</div>
                <div style={s.infoValue}>{result.cluster_name}</div>
                <div style={s.infoSub}>Cluster {result.cluster_id}</div>
              </div>

              {stayResult && (
                <div style={s.infoCard}>
                  <div style={s.infoIcon}>🏥</div>
                  <div style={s.infoLabel}>Predicted Stay</div>
                  <div style={s.infoValue}>{stayResult.predicted_days} days</div>
                  <div style={s.infoSub}>{stayResult.predicted_days_range}</div>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div style={s.disclaimer}>
              ⚠ This prediction is for academic/research purposes only. Not a substitute for clinical judgment.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  layout:      { display: "grid", gridTemplateColumns: "420px 1fr", gap: 20, alignItems: "start" },
  formPanel:   { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 24px 20px" },
  panelHeader: { marginBottom: 22 },
  panelTitle:  { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" },
  panelSub:    { fontSize: 11, color: "#3a4a6a", fontFamily: "'DM Mono', monospace", marginTop: 4 },

  fieldsWrap:  { display: "flex", flexDirection: "column", gap: 18 },
  fieldRow:    { display: "flex", flexDirection: "column", gap: 4 },
  fieldTop:    { display: "flex", justifyContent: "space-between", alignItems: "center" },
  fieldLabel:  { fontSize: 12.5, color: "#c8d0e0", fontWeight: 500 },
  fieldValue:  { fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#e74c3c",
                 background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)",
                 borderRadius: 6, padding: "1px 8px", minWidth: 36, textAlign: "center" },
  slider:      { width: "100%", accentColor: "#e74c3c", cursor: "pointer" },
  fieldHint:   { fontSize: 10, color: "#2a3a5a", fontFamily: "'DM Mono', monospace" },

  assessBtn:   { marginTop: 24, width: "100%", padding: "14px",
                 background: "linear-gradient(135deg, #c0392b, #e74c3c)",
                 color: "#fff", border: "none", borderRadius: 10,
                 fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                 cursor: "pointer", display: "flex", alignItems: "center",
                 justifyContent: "center", gap: 8,
                 boxShadow: "0 4px 20px rgba(231,76,60,0.3)",
                 transition: "transform 0.1s" },
  errorBox:    { marginTop: 12, background: "rgba(231,76,60,0.08)",
                 border: "1px solid rgba(231,76,60,0.2)", borderRadius: 8,
                 padding: "10px 14px", color: "#e74c3c", fontSize: 12 },

  resultPanel: { background: "var(--bg-card)", border: "1px solid var(--border)",
                 borderRadius: 14, padding: "28px 28px", minHeight: 400 },

  emptyState:  { display: "flex", flexDirection: "column", alignItems: "center",
                 justifyContent: "center", height: 350, gap: 14, textAlign: "center" },
  emptyIcon:   { fontSize: 48, color: "var(--bg-card-alt)" },
  emptyTitle:  { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18,
                 color: "var(--text-muted)" },
  emptySub:    { fontSize: 13, color: "var(--text-muted)", maxWidth: 280, lineHeight: 1.7 },

  loadingState:{ display: "flex", flexDirection: "column", alignItems: "center",
                 justifyContent: "center", height: 350, gap: 18 },
  bigSpinner:  { width: 48, height: 48, border: "3px solid var(--border)",
                 borderTopColor: "rgb(var(--brand-rgb))", borderRadius: "50%",
                 animation: "spin 0.8s linear infinite" },
  loadingText: { color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 12 },
  spinner:     { width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                 borderTopColor: "#fff", borderRadius: "50%",
                 animation: "spin 0.7s linear infinite" },

  riskBadge:   { display: "flex", alignItems: "center", gap: 16, padding: "18px 22px",
                 borderRadius: 12, marginBottom: 24 },
  riskIcon:    { fontSize: 32 },
  riskLabel:   { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22 },
  riskProb:    { fontSize: 12, color: "#8899bb", marginTop: 2 },

  probSection: { marginBottom: 24 },
  probHeader:  { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  probTitle:   { fontSize: 12.5, color: "#8899bb" },
  probPct:     { fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#fff" },
  probTrack:   { height: 12, background: "#141c2e", borderRadius: 6,
                 overflow: "visible", position: "relative" },
  probFill:    { height: "100%", borderRadius: 6, transition: "width 0.8s ease" },
  marker:      { position: "absolute", top: -3, width: 2, height: 18,
                 background: "#2a3a5a", borderRadius: 1 },
  probScale:   { display: "flex", justifyContent: "space-between", marginTop: 6,
                 fontSize: 10, color: "#2a3a5a", fontFamily: "'DM Mono', monospace" },
  markerLow:   { marginLeft: "8%" },
  markerMod:   { marginLeft: "5%" },
  markerHigh:  {},

  reasonsSection: { marginBottom: 24 },
  sectionLabel:   { fontSize: 11.5, color: "#8899bb", fontFamily: "'DM Mono', monospace",
                    marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" },
  reasonRow:   { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  reasonNum:   { width: 22, height: 22, borderRadius: "50%", display: "flex",
                 alignItems: "center", justifyContent: "center",
                 fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 },
  reasonText:  { fontSize: 13, color: "#c8d0e0" },

  infoGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 },
  infoCard:    { background: "#141c2e", border: "1px solid #1a2235",
                 borderRadius: 10, padding: "16px 18px" },
  infoIcon:    { fontSize: 20, marginBottom: 8 },
  infoLabel:   { fontSize: 10.5, color: "#3a4a6a", fontFamily: "'DM Mono', monospace",
                 textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 },
  infoValue:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15,
                 color: "#fff" },
  infoSub:     { fontSize: 11, color: "#3a4a6a", marginTop: 3 },

  disclaimer:  { fontSize: 10.5, color: "#2a3a5a", fontFamily: "'DM Mono', monospace",
                 background: "#0a0d14", border: "1px solid #141c2e",
                 borderRadius: 8, padding: "10px 14px", lineHeight: 1.6 },
};