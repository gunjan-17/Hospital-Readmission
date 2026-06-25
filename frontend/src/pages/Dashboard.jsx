import { useState, useEffect } from "react";

const API = "http://localhost:5000/api";

// ── Reusable mini components ──────────────────────────────────────

function KpiCard({ label, value, sub, color, delay }) {
  return (
    <div className={`fade-up-${delay}`} style={{ ...s.kpiCard, borderTopColor: color }}>
      <div style={{ ...s.kpiValue, color }}>{value}</div>
      <div style={s.kpiLabel}>{label}</div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={s.sectionTitle}>{children}</div>;
}

function BarRow({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={s.barRow}>
      <div style={s.barLabel}>{label}</div>
      <div style={s.barTrack}>
        <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
      </div>
      <div style={s.barVal}>{value}%</div>
    </div>
  );
}

function Loader() {
  return (
    <div style={s.loaderWrap}>
      <div style={s.spinner} />
      <span style={s.loaderText}>Loading data…</span>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetch(`${API}/dashboard-stats`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => {
        setError("Could not reach Flask API. Make sure backend is running on localhost:5000.");
        setLoading(false);
      });
  }, []);

  if (loading) return <Loader />;
  if (error)   return <ErrorBanner msg={error} />;

  const { kpis, stay_distribution, cluster_distribution,
          readmission_by_medications, readmission_by_diagnoses,
          readmission_by_inpatient } = data;

  const maxMedRate   = Math.max(...(readmission_by_medications || []).map(r => r.rate), 1);
  const maxDiagRate  = Math.max(...(readmission_by_diagnoses   || []).map(r => r.rate), 1);
  const maxInpatRate = Math.max(...(readmission_by_inpatient   || []).map(r => r.rate), 1);
  const maxStay      = Math.max(...(stay_distribution          || []).map(r => r.count), 1);

  return (
    <div style={s.page}>

      {/* ── KPIs ── */}
      <div style={s.kpiGrid} className="fade-up">
        <KpiCard
          label="Total Patients"
          value={kpis.total_patients.toLocaleString()}
          sub="Unique encounters"
          color="#3b82f6" delay={1}
        />
        <KpiCard
          label="Readmission Rate"
          value={`${kpis.readmission_rate_pct}%`}
          sub="Readmitted < 30 days"
          color="#e74c3c" delay={2}
        />
        <KpiCard
          label="Avg Stay Duration"
          value={`${kpis.avg_stay_days} days`}
          sub="Mean hospital stay"
          color="#f59e0b" delay={3}
        />
        <KpiCard
          label="High-Risk Patients"
          value={`${kpis.high_risk_patients_pct}%`}
          sub="Multiple risk factors"
          color="#a855f7" delay={4}
        />
      </div>

      {/* ── Row 2: Medication + Diagnoses ── */}
      <div style={s.row2}>

        <div style={s.card} className="fade-up-2">
          <SectionTitle>📊 Readmission Rate by Medication Count</SectionTitle>
          <div style={s.barsWrap}>
            {(readmission_by_medications || []).map((d) => (
              <BarRow key={d.medication_range}
                label={d.medication_range + " meds"}
                value={d.rate} max={maxMedRate}
                color="linear-gradient(90deg, #e74c3c, #c0392b)" />
            ))}
          </div>
          <div style={s.chartNote}>
            Higher medication count correlates with increased readmission risk.
          </div>
        </div>

        <div style={s.card} className="fade-up-2">
          <SectionTitle>🩺 Readmission Rate by Number of Diagnoses</SectionTitle>
          <div style={s.barsWrap}>
            {(readmission_by_diagnoses || []).map((d) => (
              <BarRow key={d.num_diagnoses}
                label={`${d.num_diagnoses} diagnoses`}
                value={d.rate} max={maxDiagRate}
                color="linear-gradient(90deg, #3b82f6, #1d4ed8)" />
            ))}
          </div>
          <div style={s.chartNote}>
            Patients with more diagnoses show higher readmission rates.
          </div>
        </div>

      </div>

      {/* ── Row 3: Stay Distribution + Cluster Distribution ── */}
      <div style={s.row2}>

        <div style={s.card} className="fade-up-3">
          <SectionTitle>🏥 Hospital Stay Duration Distribution</SectionTitle>
          <div style={s.histogram}>
            {(stay_distribution || []).map((d) => {
              const h = Math.max(8, (d.count / maxStay) * 160);
              return (
                <div key={d.days} style={s.histCol}>
                  <div style={s.histBarWrap}>
                    <div style={{ ...s.histBar, height: h }} title={`${d.count} patients`} />
                  </div>
                  <div style={s.histLabel}>{d.days}</div>
                </div>
              );
            })}
          </div>
          <div style={s.histXLabel}>Days in Hospital</div>
        </div>

        <div style={s.card} className="fade-up-3">
          <SectionTitle>👥 Patient Distribution by Cluster</SectionTitle>
          {(cluster_distribution || []).map((c) => (
            <div key={c.cluster_id} style={s.clusterRow}>
              <div style={s.clusterDot(c.cluster_id)} />
              <div style={{ flex: 1 }}>
                <div style={s.clusterName}>{c.cluster_name}</div>
                <div style={s.clusterBar}>
                  <div style={{ ...s.clusterFill, width: `${c.pct}%`,
                    background: CLUSTER_COLORS[c.cluster_id % 4] }} />
                </div>
              </div>
              <div style={s.clusterPct}>{c.pct}%</div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Row 4: Prior Inpatient visits ── */}
      <div style={s.cardFull} className="fade-up-4">
        <SectionTitle>🔁 Readmission Rate by Prior Inpatient Visits</SectionTitle>
        <div style={s.inpatientChart}>
          {(readmission_by_inpatient || []).map((d, i) => {
            const h = Math.max(8, (d.rate / maxInpatRate) * 140);
            const color = d.rate > 20 ? "#e74c3c" : d.rate > 12 ? "#f59e0b" : "#2ecc71";
            return (
              <div key={d.prior_visits} style={s.inpCol}>
                <div style={s.inpRateLabel}>{d.rate}%</div>
                <div style={s.inpBarWrap}>
                  <div style={{ ...s.inpBar, height: h, background: color }} />
                </div>
                <div style={s.inpLabel}>{d.prior_visits} visit{d.prior_visits !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </div>
        <div style={s.chartNote}>
          Patients with more prior inpatient visits are significantly more likely to be readmitted.
        </div>
      </div>

    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={s.errorBanner}>
      <span style={s.errorIcon}>⚠</span>
      <span>{msg}</span>
    </div>
  );
}

const CLUSTER_COLORS = ["#e74c3c", "#f59e0b", "#3b82f6", "#2ecc71"];

const s = {
  page:       { display: "flex", flexDirection: "column", gap: 20 },
  loaderWrap: { display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: 300, gap: 16 },
  spinner:    { width: 36, height: 36, border: "3px solid var(--border)",
                borderTopColor: "var(--danger)", borderRadius: "50%",
                animation: "spin 0.8s linear infinite" },
  loaderText: { color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 12 },
  errorBanner:{ background: "rgba(var(--brand-rgb), 0.1)", border: "1px solid rgba(var(--brand-rgb), 0.3)",
                borderRadius: 12, padding: "18px 22px", color: "rgb(var(--brand-rgb))",
                display: "flex", alignItems: "center", gap: 12, fontSize: 14 },
  errorIcon:  { fontSize: 20 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  kpiCard: { background: "var(--bg-card)", border: "1px solid var(--border)",
             borderTop: "3px solid", borderRadius: 14, padding: "20px 22px" },
  kpiValue: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28,
              letterSpacing: "-1px", color: "var(--text-primary)" },
  kpiLabel: { color: "var(--text-secondary)", fontSize: 12, marginTop: 6, fontWeight: 500 },
  kpiSub:   { color: "var(--text-muted)", fontSize: 10.5, marginTop: 3,
              fontFamily: "'DM Mono', monospace" },

  row2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card:     { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
              padding: "22px 24px" },
  cardFull: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
              padding: "22px 24px" },

  sectionTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13.5,
                  color: "var(--text-secondary)", marginBottom: 18, letterSpacing: "-0.2px" },
  chartNote:    { color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono', monospace",
                  marginTop: 14, lineHeight: 1.5 },

  barsWrap: { display: "flex", flexDirection: "column", gap: 10 },
  barRow:   { display: "flex", alignItems: "center", gap: 10 },
  barLabel: { fontSize: 11.5, color: "var(--text-secondary)", width: 80, flexShrink: 0,
              fontFamily: "'DM Mono', monospace" },
  barTrack: { flex: 1, height: 8, background: "var(--bg-card-alt)", borderRadius: 4, overflow: "hidden" },
  barFill:  { height: "100%", borderRadius: 4, transition: "width 0.6s ease" },
  barVal:   { fontSize: 11, color: "var(--text-primary)", width: 38, textAlign: "right",
              fontFamily: "'DM Mono', monospace" },

  histogram:   { display: "flex", alignItems: "flex-end", gap: 4, height: 180,
                 padding: "0 4px" },
  histCol:     { flex: 1, display: "flex", flexDirection: "column",
                 alignItems: "center" },
  histBarWrap: { flex: 1, display: "flex", alignItems: "flex-end",
                 width: "100%" },
  histBar:     { width: "100%", background: "var(--accent-primary)",
                 borderRadius: "3px 3px 0 0", transition: "height 0.4s ease",
                 cursor: "pointer" },
  histLabel:   { fontSize: 9.5, color: "#3a4a6a", marginTop: 5,
                 fontFamily: "'DM Mono', monospace" },
  histXLabel:  { textAlign: "center", fontSize: 11, color: "#3a4a6a", marginTop: 8,
                 fontFamily: "'DM Mono', monospace" },

  clusterRow:  { display: "flex", alignItems: "center", gap: 12,
                 marginBottom: 14 },
  clusterDot:  (id) => ({
                 width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                 background: CLUSTER_COLORS[id % 4] }),
  clusterName: { fontSize: 12, color: "#c8d0e0", marginBottom: 5 },
  clusterBar:  { height: 6, background: "var(--bg-card-alt)", borderRadius: 3, overflow: "hidden" },
  clusterFill: { height: "100%", borderRadius: 3, transition: "width 0.6s ease" },
  clusterPct:  { fontSize: 11.5, color: "#8899bb", width: 38, textAlign: "right",
                 fontFamily: "'DM Mono', monospace" },

  inpatientChart: { display: "flex", alignItems: "flex-end", gap: 14,
                    height: 180, padding: "0 8px", marginBottom: 8 },
  inpCol:    { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" },
  inpRateLabel: { fontSize: 10, color: "var(--text-secondary)", marginBottom: 4,
                  fontFamily: "'DM Mono', monospace" },
  inpBarWrap: { flex: 1, display: "flex", alignItems: "flex-end", width: "100%" },
  inpBar:    { width: "100%", borderRadius: "4px 4px 0 0",
               transition: "height 0.4s ease", minHeight: 8 },
  inpLabel:  { fontSize: 9.5, color: "var(--text-muted)", marginTop: 5, textAlign: "center",
               fontFamily: "'DM Mono', monospace" },
};
