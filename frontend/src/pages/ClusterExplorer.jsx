import { useState, useEffect } from "react";

const API = "http://localhost:5000/api";

const COLORS  = ["#e74c3c", "#f59e0b", "#3b82f6", "#2ecc71", "#a855f7", "#06b6d4"];
const RISK_BG = ["rgba(231,76,60,0.1)", "rgba(245,158,11,0.1)", "rgba(59,130,246,0.1)", "rgba(46,204,113,0.1)"];

function StatRow({ label, value, unit }) {
  return (
    <div style={s.statRow}>
      <span style={s.statLabel}>{label}</span>
      <span style={s.statValue}>{value}<span style={s.statUnit}> {unit}</span></span>
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  return (
    <div style={s.miniBarRow}>
      <span style={s.miniBarLabel}>{label}</span>
      <div style={s.miniBarTrack}>
        <div style={{ ...s.miniBarFill, width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
      </div>
      <span style={s.miniBarVal}>{value}</span>
    </div>
  );
}

export default function ClusterExplorer() {
  const [clusters, setClusters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    fetch(`${API}/clusters`)
      .then((r) => r.json())
      .then((d) => {
        setClusters(d.clusters || []);
        if (d.clusters?.length) setSelected(d.clusters[0]);
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot reach Flask API on localhost:5000");
        setLoading(false);
      });
  }, []);

  if (loading) return <Loader />;
  if (error)   return <ErrorBanner msg={error} />;

  const total  = clusters.reduce((s, c) => s + c.patient_count, 0);
  const maxRate = Math.max(...clusters.map((c) => c.readmission_rate), 1);
  const maxMed  = Math.max(...clusters.map((c) => c.avg_medications), 1);
  const maxDiag = Math.max(...clusters.map((c) => c.avg_diagnoses), 1);
  const maxStay = Math.max(...clusters.map((c) => c.avg_stay_days), 1);
  const maxLab  = Math.max(...clusters.map((c) => c.avg_lab_tests), 1);
  const maxInp  = Math.max(...clusters.map((c) => c.avg_inpatient), 1);

  return (
    <div style={s.page}>

      {/* ── Top: Overview cards ── */}
      <div style={s.overviewGrid} className="fade-up">
        {clusters.map((c, i) => (
          <button
            key={c.cluster_id}
            onClick={() => setSelected(c)}
            style={{
              ...s.overviewCard,
              borderColor: selected?.cluster_id === c.cluster_id ? COLORS[i] : "#1a2235",
              background:  selected?.cluster_id === c.cluster_id ? RISK_BG[i % 4] : "#0d1117",
            }}
          >
            <div style={{ ...s.overviewDot, background: COLORS[i] }} />
            <div style={s.overviewName}>{c.cluster_name}</div>
            <div style={{ ...s.overviewRate, color: COLORS[i] }}>
              {c.readmission_rate}%
            </div>
            <div style={s.overviewRateLabel}>readmission rate</div>
            <div style={s.overviewCount}>
              {c.patient_count.toLocaleString()} patients
              <span style={s.overviewPct}> ({((c.patient_count / total) * 100).toFixed(1)}%)</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Bottom: Detail + Charts ── */}
      <div style={s.detailLayout} className="fade-up-2">

        {/* Left: Readmission Rate Comparison */}
        <div style={s.card}>
          <div style={s.cardTitle}>Readmission Rate by Cluster</div>
          <div style={s.rateChart}>
            {clusters.map((c, i) => {
              const h = Math.max(12, (c.readmission_rate / maxRate) * 160);
              const isSelected = selected?.cluster_id === c.cluster_id;
              return (
                <div
                  key={c.cluster_id}
                  style={s.rateColWrap}
                  onClick={() => setSelected(c)}
                >
                  <div style={s.rateLabel}>{c.readmission_rate}%</div>
                  <div style={s.rateBarWrap}>
                    <div style={{
                      ...s.rateBar,
                      height: h,
                      background: COLORS[i],
                      opacity: isSelected ? 1 : 0.45,
                      boxShadow: isSelected ? `0 0 16px ${COLORS[i]}60` : "none",
                    }} />
                  </div>
                  <div style={{ ...s.rateColLabel, color: isSelected ? COLORS[i] : "#3a4a6a" }}>
                    C{c.cluster_id}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={s.chartNote}>Click a bar to inspect that cluster</div>
        </div>

        {/* Middle: Selected cluster detail */}
        {selected && (
          <div style={{ ...s.card, flex: 1.4, borderColor: COLORS[selected.cluster_id % COLORS.length] }}>
            <div style={s.detailHeader}>
              <div style={{
                ...s.detailDot,
                background: COLORS[selected.cluster_id % COLORS.length]
              }} />
              <div>
                <div style={s.detailName}>{selected.cluster_name}</div>
                <div style={s.detailId}>Cluster {selected.cluster_id}</div>
              </div>
              <div style={{
                ...s.detailRateBadge,
                background: `rgba(${COLORS[selected.cluster_id % COLORS.length].slice(1).match(/../g).map(x=>parseInt(x,16)).join(",")},0.15)`,
                color: COLORS[selected.cluster_id % COLORS.length],
                border: `1px solid ${COLORS[selected.cluster_id % COLORS.length]}44`
              }}>
                {selected.readmission_rate}% readmission
              </div>
            </div>

            <div style={s.statsGrid}>
              <StatRow label="Patient Count"    value={selected.patient_count.toLocaleString()} unit="" />
              <StatRow label="Avg Age Group"    value={selected.avg_age}      unit="(encoded)" />
              <StatRow label="Avg Medications"  value={selected.avg_medications} unit="meds" />
              <StatRow label="Avg Diagnoses"    value={selected.avg_diagnoses}   unit="" />
              <StatRow label="Avg Stay"         value={selected.avg_stay_days}   unit="days" />
              <StatRow label="Prior Inpatient"  value={selected.avg_inpatient}   unit="visits" />
              <StatRow label="Avg Lab Tests"    value={selected.avg_lab_tests}   unit="tests" />
            </div>
          </div>
        )}

        {/* Right: Feature comparison bars */}
        <div style={s.card}>
          <div style={s.cardTitle}>Feature Comparison Across Clusters</div>
          {[
            { label: "Avg Medications", key: "avg_medications", max: maxMed },
            { label: "Avg Diagnoses",   key: "avg_diagnoses",   max: maxDiag },
            { label: "Avg Stay (days)", key: "avg_stay_days",   max: maxStay },
            { label: "Avg Lab Tests",   key: "avg_lab_tests",   max: maxLab },
            { label: "Prior Inpatient", key: "avg_inpatient",   max: maxInp },
          ].map((feat) => (
            <div key={feat.key} style={s.featSection}>
              <div style={s.featTitle}>{feat.label}</div>
              {clusters.map((c, i) => (
                <MiniBar
                  key={c.cluster_id}
                  label={`C${c.cluster_id}`}
                  value={c[feat.key]}
                  max={feat.max}
                  color={COLORS[i]}
                />
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function Loader() {
  return (
    <div style={s.loaderWrap}>
      <div style={s.spinner} />
      <span style={s.loaderTxt}>Loading clusters…</span>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={s.errorBanner}>⚠ {msg}</div>
  );
}

const s = {
  page:         { display: "flex", flexDirection: "column", gap: 20 },
  loaderWrap:   { display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: 300, gap: 16 },
  spinner:      { width: 36, height: 36, border: "3px solid #1a2235",
                  borderTopColor: "#e74c3c", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite" },
  loaderTxt:    { color: "#3a4a6a", fontFamily: "'DM Mono', monospace", fontSize: 12 },
  errorBanner:  { background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)",
                  borderRadius: 12, padding: "18px 22px", color: "#e74c3c", fontSize: 14 },

  overviewGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  overviewCard: { background: "var(--bg-card)", border: "2px solid", borderRadius: 14,
                  padding: "20px 20px", cursor: "pointer", transition: "all 0.2s",
                  textAlign: "left" },
  overviewDot:  { width: 10, height: 10, borderRadius: "50%", marginBottom: 12 },
  overviewName: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
                  color: "#c8d0e0", lineHeight: 1.4, marginBottom: 12 },
  overviewRate: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 30,
                  letterSpacing: "-1px" },
  overviewRateLabel: { fontSize: 10, color: "#3a4a6a", fontFamily: "'DM Mono', monospace",
                       marginTop: 2, marginBottom: 10 },
  overviewCount:{ fontSize: 11.5, color: "#8899bb" },
  overviewPct:  { color: "#3a4a6a" },

  detailLayout: { display: "grid", gridTemplateColumns: "220px 1fr 260px", gap: 14 },
  card:         { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
                  padding: "22px 22px" },
  cardTitle:    { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
                  color: "var(--text-secondary)", marginBottom: 18 },
  chartNote:    { fontSize: 10.5, color: "var(--text-muted)", fontFamily: "'DM Mono', monospace",
                  marginTop: 10 },

  rateChart:    { display: "flex", alignItems: "flex-end", gap: 10, height: 200 },
  rateColWrap:  { flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", cursor: "pointer" },
  rateLabel:    { fontSize: 10, color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace",
                  marginBottom: 4 },
  rateBarWrap:  { flex: 1, display: "flex", alignItems: "flex-end", width: "100%" },
  rateBar:      { width: "100%", borderRadius: "4px 4px 0 0",
                  transition: "all 0.3s ease" },
  rateColLabel: { fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 6,
                  transition: "color 0.2s" },

  detailHeader: { display: "flex", alignItems: "center", gap: 14, marginBottom: 22,
                  flexWrap: "wrap" },
  detailDot:    { width: 14, height: 14, borderRadius: "50%", flexShrink: 0 },
  detailName:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15,
                  color: "#fff" },
  detailId:     { fontSize: 10.5, color: "#3a4a6a", fontFamily: "'DM Mono', monospace",
                  marginTop: 2 },
  detailRateBadge: { padding: "4px 12px", borderRadius: 20, fontSize: 11,
                     fontFamily: "'DM Mono', monospace", marginLeft: "auto" },
  statsGrid:    { display: "flex", flexDirection: "column", gap: 0 },
  statRow:      { display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid #111827" },
  statLabel:    { fontSize: 12.5, color: "#8899bb" },
  statValue:    { fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#fff" },
  statUnit:     { color: "#3a4a6a", fontSize: 10 },

  featSection:  { marginBottom: 16 },
  featTitle:    { fontSize: 11, color: "#8899bb", fontFamily: "'DM Mono', monospace",
                  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" },
  miniBarRow:   { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  miniBarLabel: { fontSize: 10, color: "#3a4a6a", fontFamily: "'DM Mono', monospace",
                  width: 20, flexShrink: 0 },
  miniBarTrack: { flex: 1, height: 6, background: "#141c2e", borderRadius: 3,
                  overflow: "hidden" },
  miniBarFill:  { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
  miniBarVal:   { fontSize: 10, color: "#8899bb", fontFamily: "'DM Mono', monospace",
                  width: 32, textAlign: "right" },
};